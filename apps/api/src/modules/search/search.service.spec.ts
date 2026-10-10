import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClassificationLevel, DocumentStatus, UserRole } from '@sdms/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('SearchService', () => {
  let service: SearchService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin',
    email: 'admin@sdms.gov.in',
    role: UserRole.ADMIN,
    departmentId: 'dept-police',
    authTime: Date.now(),
  };

  const mockInvestigatorUser: AuthenticatedUser = {
    id: 'user-inv-1',
    email: 'inv@sdms.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police',
    authTime: Date.now(),
  };

  const mockPrismaService = {
    document: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    shareGrant: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ABAC Scope Construction', () => {
    it('should grant unrestricted search scope to ADMIN role', async () => {
      mockPrismaService.document.count.mockResolvedValue(1);
      mockPrismaService.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          caseId: 'case-1',
          title: 'Homicide FIR',
          type: 'FIR',
          classification: ClassificationLevel.SECRET,
          status: DocumentStatus.READY,
          createdAt: new Date(),
          case: {
            id: 'case-1',
            caseNumber: 'FIR/2024/001',
            title: 'Homicide Case',
            classification: ClassificationLevel.SECRET,
          },
          versions: [
            {
              id: 'ver-1',
              versionNo: 1,
              sha256: 'abc123hash',
              sizeBytes: BigInt(1024),
              ocrResult: {
                extractedText: 'First Information Report under section 302 IPC',
                confidence: 0.95,
                extractedMetadata: { detectedType: 'FIR' },
              },
            },
          ],
        },
      ]);

      const result = await service.search({ q: 'Homicide' }, mockAdminUser);

      expect(result.results.length).toBe(1);
      expect(result.results[0].title).toBe('Homicide FIR');
      expect(result.results[0].snippet).toContain('<mark>Homicide</mark>');

      // Verify that share grants were NOT queried for ADMIN
      expect(mockPrismaService.shareGrant.findMany).not.toHaveBeenCalled();

      // Verify where clause passed to count has empty ABAC root
      const calledWhere = mockPrismaService.document.count.mock.calls[0][0].where;
      expect(calledWhere.AND[0]).toEqual({});
    });

    it('should strictly enforce ABAC filters for investigator', async () => {
      mockPrismaService.shareGrant.findMany.mockResolvedValue([
        { resourceType: 'CASE', resourceId: 'shared-case-uuid' },
        { resourceType: 'DOCUMENT', resourceId: 'shared-doc-uuid' },
      ]);

      mockPrismaService.document.count.mockResolvedValue(0);
      mockPrismaService.document.findMany.mockResolvedValue([]);

      await service.search({ q: 'weapon' }, mockInvestigatorUser);

      expect(mockPrismaService.shareGrant.findMany).toHaveBeenCalledTimes(1);

      const calledWhere = mockPrismaService.document.count.mock.calls[0][0].where;
      const abacFilter = calledWhere.AND[0];

      // Verifies that the ABAC filter contains user-specific checks (membership, creator, department PUBLIC/RESTRICTED, shares)
      expect(abacFilter.OR).toEqual(
        expect.arrayContaining([
          { createdById: mockInvestigatorUser.id },
          { id: { in: ['shared-doc-uuid'] } },
          { caseId: { in: ['shared-case-uuid'] } },
          { case: { createdById: mockInvestigatorUser.id } },
          { case: { members: { some: { userId: mockInvestigatorUser.id } } } },
          {
            case: { departmentId: mockInvestigatorUser.departmentId },
            classification: {
              in: [ClassificationLevel.PUBLIC, ClassificationLevel.RESTRICTED],
            },
          },
        ]),
      );
    });
  });

  describe('Context Snippet and Ranking', () => {
    it('should generate highlighted snippet around matched keyword', async () => {
      mockPrismaService.document.count.mockResolvedValue(1);
      mockPrismaService.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          caseId: 'case-1',
          title: 'Seizure Memo',
          type: 'SEIZURE_MEMO',
          classification: ClassificationLevel.RESTRICTED,
          status: DocumentStatus.READY,
          createdAt: new Date(),
          case: {
            id: 'case-1',
            caseNumber: 'CR/2024/099',
            title: 'Recovery investigation',
            classification: ClassificationLevel.RESTRICTED,
          },
          versions: [
            {
              id: 'ver-1',
              versionNo: 1,
              sha256: 'hash-xyz',
              sizeBytes: BigInt(2048),
              ocrResult: {
                extractedText:
                  'In the presence of panch witnesses, we recovered a firearm marked Made in Austria near the river bank.',
                confidence: 0.92,
                extractedMetadata: {},
              },
            },
          ],
        },
      ]);

      const result = await service.search({ q: 'firearm' }, mockAdminUser);
      expect(result.results.length).toBe(1);
      expect(result.results[0].snippet).toContain('<mark>firearm</mark>');
      expect(result.results[0].matchScore).toBeGreaterThan(1.0);
    });
  });
});
