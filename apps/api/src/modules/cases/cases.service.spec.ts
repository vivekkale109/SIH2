import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CaseMemberRole, CaseStatus, ClassificationLevel, UserRole } from '@sdms/shared-types';
import { CasesService } from './cases.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyService } from './policy/policy.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

interface MockPrisma {
  case: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  department: {
    findUnique: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  caseMember: {
    create: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface MockAuditService {
  record: jest.Mock;
  findAll: jest.Mock;
}

interface MockPolicyService {
  canAccessCase: jest.Mock;
  canModifyCase: jest.Mock;
  canManageMembers: jest.Mock;
  canTransitionStatus: jest.Mock;
  buildAbacWhereClause: jest.Mock;
}

describe('CasesService', () => {
  let service: CasesService;
  let prisma: MockPrisma;
  let auditService: MockAuditService;
  let policyService: MockPolicyService;

  const mockUser: AuthenticatedUser = {
    id: 'user-lead-1',
    email: 'lead@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police-1',
    authTime: Date.now(),
  };

  const mockDepartment = {
    id: 'dept-police-1',
    name: 'Cyber Crime Branch',
    code: 'POL-CCB',
    type: 'POLICE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCase = {
    id: 'case-uuid-1',
    caseNumber: 'FIR-2026-DEL-0099',
    title: 'Identity Theft Ring',
    description: 'Investigation into unauthorized identity creation',
    status: CaseStatus.OPEN,
    classification: ClassificationLevel.RESTRICTED,
    departmentId: 'dept-police-1',
    createdById: 'user-lead-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    department: mockDepartment,
    createdBy: {
      id: 'user-lead-1',
      email: 'lead@police.gov.in',
      fullName: 'Inspector Lead',
      role: UserRole.INVESTIGATOR,
      departmentId: 'dept-police-1',
      isActive: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    members: [
      {
        id: 'cm-1',
        caseId: 'case-uuid-1',
        userId: 'user-lead-1',
        caseRole: CaseMemberRole.LEAD_INVESTIGATOR,
        assignedAt: new Date(),
        user: {
          id: 'user-lead-1',
          email: 'lead@police.gov.in',
          fullName: 'Inspector Lead',
          role: UserRole.INVESTIGATOR,
          departmentId: 'dept-police-1',
          isActive: true,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    _count: { documents: 0 },
  };

  beforeEach(async () => {
    prisma = {
      case: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      caseMember: {
        create: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1', sequence: 1 }),
      findAll: jest.fn().mockResolvedValue({ items: [] }),
    };

    policyService = {
      canAccessCase: jest.fn().mockResolvedValue(true),
      canModifyCase: jest.fn().mockResolvedValue(true),
      canManageMembers: jest.fn().mockResolvedValue(true),
      canTransitionStatus: jest.fn().mockResolvedValue(true),
      buildAbacWhereClause: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: PolicyService, useValue: policyService },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
  });

  describe('create', () => {
    it('should create a case and assign creator as LEAD_INVESTIGATOR with audit record', async () => {
      prisma.case.findUnique
        .mockResolvedValueOnce(null) // uniqueness check
        .mockResolvedValueOnce(mockCase); // findById after creation

      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.case.create.mockResolvedValue(mockCase);

      const result = await service.create(
        {
          caseNumber: 'FIR-2026-DEL-0099',
          title: 'Identity Theft Ring',
        },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.caseNumber).toBe('FIR-2026-DEL-0099');
      expect(prisma.caseMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseRole: CaseMemberRole.LEAD_INVESTIGATOR,
          userId: mockUser.id,
        }),
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASE_CREATED',
          actorId: mockUser.id,
        }),
      );
    });

    it('should throw ConflictException on duplicate case number', async () => {
      prisma.case.findUnique.mockResolvedValue(mockCase);

      await expect(
        service.create(
          {
            caseNumber: 'FIR-2026-DEL-0099',
            title: 'Duplicate',
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated cases filtered by ABAC policy', async () => {
      prisma.case.count.mockResolvedValue(1);
      prisma.case.findMany.mockResolvedValue([mockCase]);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(policyService.buildAbacWhereClause).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateStatus', () => {
    it('should transition case status and record audit event', async () => {
      prisma.case.findUnique
        .mockResolvedValueOnce(mockCase) // find existing
        .mockResolvedValueOnce({ ...mockCase, status: CaseStatus.UNDER_REVIEW }); // findById after update

      prisma.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.UNDER_REVIEW,
      });

      const result = await service.updateStatus(
        'case-uuid-1',
        { status: CaseStatus.UNDER_REVIEW, reason: 'Investigation submitted for review' },
        mockUser,
      );

      expect(result.status).toBe(CaseStatus.UNDER_REVIEW);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASE_STATUS_CHANGED',
          metadata: expect.objectContaining({
            previousStatus: CaseStatus.OPEN,
            newStatus: CaseStatus.UNDER_REVIEW,
          }),
        }),
      );
    });
  });

  describe('addMember', () => {
    it('should add member to case and emit audit record', async () => {
      prisma.case.findUnique.mockResolvedValueOnce(mockCase).mockResolvedValueOnce(mockCase);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-member-2',
        email: 'investigator@police.gov.in',
        isActive: true,
      });

      await service.addMember(
        'case-uuid-1',
        {
          userId: 'user-member-2',
          caseRole: CaseMemberRole.INVESTIGATOR,
        },
        mockUser,
      );

      expect(prisma.caseMember.upsert).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASE_MEMBER_ADDED',
        }),
      );
    });
  });

  describe('removeMember', () => {
    it('should disallow removing the sole Lead Investigator', async () => {
      prisma.case.findUnique.mockResolvedValue(mockCase);

      await expect(service.removeMember('case-uuid-1', 'user-lead-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
