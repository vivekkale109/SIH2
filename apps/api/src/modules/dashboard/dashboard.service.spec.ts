import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { UserRole } from '@sdms/shared-types';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let auditService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-investigator-1',
    email: 'investigator@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police-1',
    badgeNumber: 'POL-1001',
    authTime: Math.floor(Date.now() / 1000),
  };

  beforeEach(async () => {
    prisma = {
      auditLedger: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-1',
            sequence: BigInt(1),
            action: 'LOGIN_SUCCESS',
            actorId: 'user-investigator-1',
            entityType: 'User',
            entityId: 'user-investigator-1',
            timestamp: new Date(),
          },
        ]),
      },
      case: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'case-1',
            caseNumber: 'FIR-2026-001',
            title: 'Cyber Fraud Investigation',
            status: 'OPEN',
            classification: 'RESTRICTED',
            createdAt: new Date(),
            _count: { documents: 3 },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          caseNumber: 'FIR-2026-001',
          title: 'Cyber Fraud Investigation',
        }),
      },
      document: {
        count: jest.fn().mockResolvedValue(8),
        findUnique: jest.fn(),
      },
      exportPackage: {
        count: jest.fn().mockResolvedValue(2),
      },
      shareGrant: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'share-1',
            resourceType: 'CASE',
            resourceId: 'case-1',
            scope: 'VIEW_ONLY',
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
            grantee: { email: 'prosecutor@court.gov.in' },
          },
        ]),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-investigator-1', email: 'investigator@police.gov.in' }]),
      },
    };

    auditService = {
      verifyChain: jest.fn().mockResolvedValue({
        valid: true,
        totalEntries: 10,
        lastSequence: 10,
        checkedAt: new Date().toISOString(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return aggregated stats for authenticated user', async () => {
    const stats = await service.getStats(mockUser);

    expect(stats).toBeDefined();
    expect(stats.overview.auditChainValid).toBe(true);
    expect(stats.overview.auditLedgerTotal).toBe(10);
    expect(stats.overview.totalCases).toBe(4);
    expect(stats.overview.totalDocuments).toBe(8);
    expect(stats.overview.totalExports).toBe(2);
    expect(stats.recentCases).toHaveLength(1);
    expect(stats.recentCases[0].caseNumber).toBe('FIR-2026-001');
    expect(stats.expiringShares).toHaveLength(1);
    expect(stats.expiringShares[0].isUrgent).toBe(true);
    expect(stats.recentAuditLogs).toHaveLength(1);
    expect(stats.recentAuditLogs[0].actorEmail).toBe('investigator@police.gov.in');
  });

  it('should handle audit verification failure gracefully and fallback', async () => {
    auditService.verifyChain.mockRejectedValueOnce(new Error('Connection lost'));

    const stats = await service.getStats(mockUser);

    expect(stats.overview.auditChainValid).toBe(false);
    expect(stats.overview.auditLedgerTotal).toBe(10);
  });
});
