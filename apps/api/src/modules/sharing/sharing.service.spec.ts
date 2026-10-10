import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SharingService } from './sharing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyService } from '../cases/policy/policy.service';
import { UserRole, ShareScope, AuditAction } from '@sdms/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('SharingService', () => {
  let service: SharingService;

  const mockUser: AuthenticatedUser = {
    id: 'user-investigator-1',
    email: 'investigator@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police',
    authTime: Math.floor(Date.now() / 1000) - 60, // Authenticated 1 minute ago (within re-auth window)
  };

  const mockCourtOfficer: AuthenticatedUser = {
    id: 'user-court-1',
    email: 'court.officer@court.gov.in',
    role: UserRole.COURT_OFFICER,
    departmentId: 'dept-court',
    authTime: Math.floor(Date.now() / 1000) - 60,
  };

  const mockPrismaService = {
    shareGrant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    case: {
      findUnique: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue({}),
  };

  const mockPolicyService = {
    canShareResource: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PolicyService, useValue: mockPolicyService },
      ],
    }).compile();

    service = module.get<SharingService>(SharingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShare', () => {
    it('should reject if neither granteeId nor granteeDepartmentId is provided', async () => {
      await expect(
        service.createShare(
          {
            resourceType: 'CASE',
            resourceId: 'case-1',
            scope: ShareScope.VIEW_ONLY,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if granter tries to share with themselves', async () => {
      await expect(
        service.createShare(
          {
            resourceType: 'CASE',
            resourceId: 'case-1',
            granteeId: mockUser.id,
            scope: ShareScope.VIEW_ONLY,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if expiresAt is in the past', async () => {
      await expect(
        service.createShare(
          {
            resourceType: 'CASE',
            resourceId: 'case-1',
            granteeId: 'user-court-1',
            scope: ShareScope.VIEW_ONLY,
            expiresAt: new Date(Date.now() - 10000).toISOString(),
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if user lacks ABAC clearance to share resource', async () => {
      mockPolicyService.canShareResource.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-court-1',
        isActive: true,
      });

      await expect(
        service.createShare(
          {
            resourceType: 'CASE',
            resourceId: 'case-1',
            granteeId: 'user-court-1',
            scope: ShareScope.VIEW_ONLY,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create share grant and record SHARE_CREATED in ledger when valid', async () => {
      mockPolicyService.canShareResource.mockResolvedValue(true);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-court-1',
        isActive: true,
      });
      mockPrismaService.case.findUnique.mockResolvedValue({
        id: 'case-1',
        title: 'Cyber Intrusion Investigation',
        caseNumber: 'FIR-2026-101',
      });

      const fakeExpiresAt = new Date(Date.now() + 86400000);
      const fakeCreatedAt = new Date();

      mockPrismaService.shareGrant.create.mockResolvedValue({
        id: 'share-999',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        granteeId: 'user-court-1',
        granteeDepartmentId: null,
        scope: ShareScope.VIEW_ONLY,
        expiresAt: fakeExpiresAt,
        revokedAt: null,
        createdAt: fakeCreatedAt,
        granter: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Investigator Sharma',
          role: UserRole.INVESTIGATOR,
          departmentId: 'dept-police',
          isActive: true,
          mfaEnabled: true,
          createdAt: fakeCreatedAt,
          updatedAt: fakeCreatedAt,
        },
        grantee: {
          id: 'user-court-1',
          email: 'court.officer@court.gov.in',
          fullName: 'Court Registrar',
          role: UserRole.COURT_OFFICER,
          departmentId: 'dept-court',
          isActive: true,
          mfaEnabled: true,
          createdAt: fakeCreatedAt,
          updatedAt: fakeCreatedAt,
        },
      });

      const result = await service.createShare(
        {
          resourceType: 'CASE',
          resourceId: 'case-1',
          granteeId: 'user-court-1',
          scope: ShareScope.VIEW_ONLY,
          expiresAt: fakeExpiresAt.toISOString(),
        },
        mockUser,
      );

      expect(result.id).toBe('share-999');
      expect(result.scope).toBe(ShareScope.VIEW_ONLY);
      expect(result.resourceTitle).toBe('Cyber Intrusion Investigation');
      expect(result.isExpired).toBe(false);
      expect(result.isRevoked).toBe(false);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SHARE_CREATED,
          entityType: 'ShareGrant',
          entityId: 'share-999',
        }),
      );
    });
  });

  describe('revokeShare', () => {
    it('should revoke active share grant and record SHARE_REVOKED in ledger', async () => {
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-1',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        revokedAt: null,
      });

      mockPrismaService.shareGrant.update.mockResolvedValue({
        id: 'share-1',
        revokedAt: new Date(),
      });

      const res = await service.revokeShare('share-1', mockUser);
      expect(res.success).toBe(true);

      expect(mockPrismaService.shareGrant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'share-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SHARE_REVOKED,
          entityType: 'ShareGrant',
          entityId: 'share-1',
        }),
      );
    });

    it('should reject unauthorized user attempting to revoke share grant', async () => {
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-1',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: 'someone-else',
        revokedAt: null,
      });
      mockPolicyService.canShareResource.mockResolvedValue(false);

      await expect(service.revokeShare('share-1', mockCourtOfficer)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('accessSharedResource', () => {
    it('should reject with 403 Forbidden immediately if share grant is revoked', async () => {
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-revoked',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        granteeId: mockCourtOfficer.id,
        scope: ShareScope.VIEW_ONLY,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(Date.now() - 3600000), // Revoked an hour ago
        granter: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Inv',
          role: UserRole.INVESTIGATOR,
          departmentId: 'd',
          isActive: true,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await expect(service.accessSharedResource('share-revoked', mockCourtOfficer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject with 403 Forbidden immediately if share grant has expired', async () => {
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-expired',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        granteeId: mockCourtOfficer.id,
        scope: ShareScope.VIEW_ONLY,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        revokedAt: null,
        granter: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Inv',
          role: UserRole.INVESTIGATOR,
          departmentId: 'd',
          isActive: true,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await expect(service.accessSharedResource('share-expired', mockCourtOfficer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if an unauthorized third party attempts to access the share grant', async () => {
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-active',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        granteeId: 'user-court-1',
        granteeDepartmentId: 'dept-court',
        scope: ShareScope.VIEW_ONLY,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        granter: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Inv',
          role: UserRole.INVESTIGATOR,
          departmentId: 'd',
          isActive: true,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const thirdPartyUser: AuthenticatedUser = {
        id: 'unauthorized-user',
        email: 'intruder@other.gov.in',
        role: UserRole.PROSECUTOR,
        departmentId: 'dept-other',
        authTime: Date.now(),
      };

      await expect(service.accessSharedResource('share-active', thirdPartyUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should permit authorized recipient, return resource, and record SHARE_ACCESSED in ledger', async () => {
      const now = new Date();
      mockPrismaService.shareGrant.findUnique.mockResolvedValue({
        id: 'share-active',
        resourceType: 'CASE',
        resourceId: 'case-1',
        granterId: mockUser.id,
        granteeId: mockCourtOfficer.id,
        granteeDepartmentId: 'dept-court',
        scope: ShareScope.VIEW_ONLY,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: now,
        granter: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Inv',
          role: UserRole.INVESTIGATOR,
          departmentId: 'dept-police',
          isActive: true,
          mfaEnabled: false,
          createdAt: now,
          updatedAt: now,
        },
        grantee: {
          id: mockCourtOfficer.id,
          email: mockCourtOfficer.email,
          fullName: 'Court',
          role: UserRole.COURT_OFFICER,
          departmentId: 'dept-court',
          isActive: true,
          mfaEnabled: false,
          createdAt: now,
          updatedAt: now,
        },
      });

      mockPrismaService.case.findUnique.mockResolvedValue({
        id: 'case-1',
        title: 'Bank Heist Investigation',
        caseNumber: 'FIR-2026-909',
        department: { id: 'dept-police', name: 'Cyber Police' },
        documents: [],
      });

      const accessResult = await service.accessSharedResource('share-active', mockCourtOfficer);
      expect(accessResult.share.id).toBe('share-active');
      expect(accessResult.resource['title']).toBe('Bank Heist Investigation');

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SHARE_ACCESSED,
          entityType: 'ShareGrant',
          entityId: 'share-active',
        }),
      );
    });
  });
});
