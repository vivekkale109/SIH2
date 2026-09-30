import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CaseMemberRole, CaseStatus, ClassificationLevel } from '@prisma/client';
import { UserRole } from '@sdms/shared-types';
import { PolicyService } from './policy.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

interface MockPrisma {
  case: {
    findUnique: jest.Mock;
  };
  shareGrant: {
    findFirst: jest.Mock;
  };
}

describe('PolicyService (ABAC)', () => {
  let service: PolicyService;
  let prisma: MockPrisma;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin',
    email: 'admin@sdms.gov.in',
    role: UserRole.ADMIN,
    departmentId: 'dept-admin',
    authTime: Date.now(),
  };

  const mockAuditorUser: AuthenticatedUser = {
    id: 'user-auditor',
    email: 'auditor@vigilance.gov.in',
    role: UserRole.AUDITOR,
    departmentId: 'dept-auditor',
    authTime: Date.now(),
  };

  const mockInvestigatorSameDept: AuthenticatedUser = {
    id: 'user-inv-1',
    email: 'inv1@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police-1',
    authTime: Date.now(),
  };

  const mockInvestigatorOtherDept: AuthenticatedUser = {
    id: 'user-inv-2',
    email: 'inv2@other.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police-2',
    authTime: Date.now(),
  };

  const mockCase = {
    id: 'case-1',
    caseNumber: 'FIR-2026-DEL-0001',
    title: 'Bank Fraud',
    classification: ClassificationLevel.RESTRICTED,
    departmentId: 'dept-police-1',
    createdById: 'user-creator',
    status: CaseStatus.OPEN,
    members: [],
  };

  beforeEach(async () => {
    prisma = {
      case: {
        findUnique: jest.fn(),
      },
      shareGrant: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PolicyService>(PolicyService);
  });

  describe('canAccessCase', () => {
    it('should always allow ADMIN without database lookup', async () => {
      const allowed = await service.canAccessCase(mockAdminUser, 'case-1');
      expect(allowed).toBe(true);
      expect(prisma.case.findUnique).not.toHaveBeenCalled();
    });

    it('should always allow AUDITOR without database lookup', async () => {
      const allowed = await service.canAccessCase(mockAuditorUser, 'case-1');
      expect(allowed).toBe(true);
      expect(prisma.case.findUnique).not.toHaveBeenCalled();
    });

    it('should allow the case creator', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        createdById: mockInvestigatorSameDept.id,
        members: [],
      });

      const allowed = await service.canAccessCase(mockInvestigatorSameDept, 'case-1');
      expect(allowed).toBe(true);
    });

    it('should allow an assigned member regardless of department', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        members: [
          {
            userId: mockInvestigatorOtherDept.id,
            caseRole: CaseMemberRole.INVESTIGATOR,
          },
        ],
      });

      const allowed = await service.canAccessCase(mockInvestigatorOtherDept, 'case-1');
      expect(allowed).toBe(true);
    });

    it('should allow unassigned users in same department for RESTRICTED or PUBLIC cases', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        classification: ClassificationLevel.RESTRICTED,
        members: [],
      });

      const allowed = await service.canAccessCase(mockInvestigatorSameDept, 'case-1');
      expect(allowed).toBe(true);
    });

    it('should DENY unassigned users in same department for CONFIDENTIAL or SECRET cases', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        classification: ClassificationLevel.CONFIDENTIAL,
        members: [],
      });

      const allowed = await service.canAccessCase(mockInvestigatorSameDept, 'case-1');
      expect(allowed).toBe(false);

      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        classification: ClassificationLevel.SECRET,
        members: [],
      });

      const allowedSecret = await service.canAccessCase(mockInvestigatorSameDept, 'case-1');
      expect(allowedSecret).toBe(false);
    });

    it('should strictly DENY users from a different department with no assignment or share', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        departmentId: 'dept-police-1',
        members: [],
      });

      const allowed = await service.canAccessCase(mockInvestigatorOtherDept, 'case-1');
      expect(allowed).toBe(false);
    });

    it('should throw NotFoundException if case does not exist', async () => {
      prisma.case.findUnique.mockResolvedValue(null);

      await expect(service.canAccessCase(mockInvestigatorSameDept, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('canModifyCase', () => {
    it('should disallow modifying an ARCHIVED case', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.ARCHIVED,
      });

      const allowed = await service.canModifyCase(mockAdminUser, 'case-1');
      expect(allowed).toBe(false);
    });

    it('should allow ADMIN or Case Creator to modify an open case', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
        createdById: mockInvestigatorSameDept.id,
      });

      const allowedCreator = await service.canModifyCase(mockInvestigatorSameDept, 'case-1');
      expect(allowedCreator).toBe(true);
    });

    it('should allow LEAD_INVESTIGATOR member to modify', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
        createdById: 'someone-else',
        members: [{ caseRole: CaseMemberRole.LEAD_INVESTIGATOR }],
      });

      const allowed = await service.canModifyCase(mockInvestigatorSameDept, 'case-1');
      expect(allowed).toBe(true);
    });

    it('should deny non-lead members from modifying case details', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
        createdById: 'someone-else',
        members: [{ caseRole: CaseMemberRole.INVESTIGATOR }],
      });

      const allowed = await service.canModifyCase(mockInvestigatorSameDept, 'case-1');
      expect(allowed).toBe(false);
    });
  });

  describe('canTransitionStatus', () => {
    it('should allow valid transition OPEN -> UNDER_REVIEW', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
        createdById: mockInvestigatorSameDept.id,
        members: [{ caseRole: CaseMemberRole.LEAD_INVESTIGATOR }],
      });

      const allowed = await service.canTransitionStatus(
        mockInvestigatorSameDept,
        'case-1',
        CaseStatus.UNDER_REVIEW,
      );
      expect(allowed).toBe(true);
    });

    it('should reject transition to the same status', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });

      const allowed = await service.canTransitionStatus(mockAdminUser, 'case-1', CaseStatus.OPEN);
      expect(allowed).toBe(false);
    });
  });
});
