import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { CaseStatus, ClassificationLevel, DocumentStatus, UserRole } from '@sdms/shared-types';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { ClamavService, EICAR_SIGNATURE } from '../storage/clamav.service';
import { PolicyService } from '../cases/policy/policy.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    case: { findUnique: jest.Mock };
    document: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    documentVersion: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditService: { record: jest.Mock };
  let storageService: {
    upload: jest.Mock;
    getStream: jest.Mock;
    computeSha256: jest.Mock;
  };
  let policyService: {
    canAccessCase: jest.Mock;
    canAccessDocument: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-investigator-1',
    email: 'investigator@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-police-1',
    authTime: Date.now(),
  };

  const mockCase = {
    id: 'case-uuid-1',
    caseNumber: 'FIR-2026-DEL-0101',
    title: 'Cyber Fraud Probe',
    status: CaseStatus.OPEN,
    classification: ClassificationLevel.RESTRICTED,
    departmentId: 'dept-police-1',
    createdById: 'user-investigator-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'forensic_report.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4 Mock forensic evidence content'),
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    prisma = {
      case: { findUnique: jest.fn().mockResolvedValue(mockCase) },
      document: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      documentVersion: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) =>
        callback({
          document: prisma.document,
          documentVersion: prisma.documentVersion,
        }),
      ),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1', sequence: 1n }),
    };

    storageService = {
      upload: jest.fn().mockResolvedValue({
        storageKey: 'cases/case-uuid-1/documents/doc-1/v1-forensic_report.pdf',
        sizeBytes: 1024,
        sha256: 'mock-sha256-hash',
        etag: '"etag123"',
      }),
      getStream: jest.fn().mockResolvedValue(Readable.from(['file content chunk'])),
      computeSha256: jest.fn().mockResolvedValue('mock-sha256-hash'),
    };

    policyService = {
      canAccessCase: jest.fn().mockResolvedValue(true),
      canAccessDocument: jest.fn().mockResolvedValue({ granted: true, scope: 'FULL' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        ClamavService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
        {
          provide: PolicyService,
          useValue: policyService,
        },
        {
          provide: 'CONFIG_SERVICE',
          useValue: { get: () => 'localhost' },
        },
      ],
    })
      .overrideProvider(ClamavService)
      .useValue(new ClamavService({ get: () => 'localhost' } as unknown as ConfigService))
      .compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('upload', () => {
    it('should successfully upload a clean document, hash it, encrypt to MinIO, and record audit entries', async () => {
      const mockCreatedDoc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        title: 'Forensic PDF',
        type: 'FORENSIC_REPORT',
        classification: ClassificationLevel.RESTRICTED,
        status: DocumentStatus.READY,
        currentVersionId: 'ver-uuid-1',
        createdById: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        case: mockCase,
        createdBy: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Investigator Sharma',
          role: UserRole.INVESTIGATOR,
          departmentId: mockUser.departmentId,
          isActive: true,
          mfaEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        versions: [
          {
            id: 'ver-uuid-1',
            documentId: 'doc-uuid-1',
            versionNo: 1,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v1-forensic_report.pdf',
            sha256: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
            sizeBytes: 1024n,
            mimeType: 'application/pdf',
            uploadedById: mockUser.id,
            createdAt: new Date(),
            uploadedBy: {
              id: mockUser.id,
              email: mockUser.email,
              fullName: 'Investigator Sharma',
              role: UserRole.INVESTIGATOR,
              departmentId: mockUser.departmentId,
              isActive: true,
              mfaEnabled: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      prisma.document.create.mockResolvedValue(mockCreatedDoc);
      prisma.documentVersion.create.mockResolvedValue(mockCreatedDoc.versions[0]);
      prisma.document.findUnique.mockResolvedValue(mockCreatedDoc);

      const result = await service.upload(
        'case-uuid-1',
        sampleFile,
        {
          title: 'Forensic PDF',
          type: 'FORENSIC_REPORT',
          classification: ClassificationLevel.RESTRICTED,
        },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-uuid-1');
      expect(result.latestVersionNo).toBe(1);
      expect(storageService.upload).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledTimes(3);
    });

    it('should reject with BadRequestException and quarantine when EICAR malware is detected', async () => {
      const infectedFile: Express.Multer.File = {
        ...sampleFile,
        originalname: 'eicar.com',
        buffer: Buffer.from(EICAR_SIGNATURE),
      };

      await expect(
        service.upload(
          'case-uuid-1',
          infectedFile,
          { title: 'Bad File', type: 'REPORT' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(storageService.upload).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ malwareDetected: true }),
        }),
      );
    });

    it('should throw ForbiddenException if user lacks ABAC clearance for the case', async () => {
      policyService.canAccessCase.mockResolvedValue(false);

      await expect(
        service.upload(
          'case-uuid-1',
          sampleFile,
          { title: 'Unauthorized Report', type: 'REPORT' },
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if the target case is archived', async () => {
      prisma.case.findUnique.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.ARCHIVED,
      });

      await expect(
        service.upload(
          'case-uuid-1',
          sampleFile,
          { title: 'Report on Archived Case', type: 'REPORT' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported file formats', async () => {
      const badMimeFile: Express.Multer.File = {
        ...sampleFile,
        mimetype: 'application/x-msdownload',
      };

      await expect(
        service.upload(
          'case-uuid-1',
          badMimeFile,
          { title: 'Executable', type: 'BINARY' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadNewVersion', () => {
    it('should create version 2 without overwriting version 1', async () => {
      const existingDoc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        title: 'Forensic PDF',
        case: mockCase,
        versions: [
          {
            versionNo: 1,
            sha256: 'hash-v1',
          },
        ],
      };

      const docWithV2 = {
        ...existingDoc,
        type: 'FORENSIC_REPORT',
        classification: ClassificationLevel.RESTRICTED,
        status: DocumentStatus.READY,
        currentVersionId: 'ver-uuid-2',
        createdById: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Investigator Sharma',
          role: UserRole.INVESTIGATOR,
          departmentId: mockUser.departmentId,
          isActive: true,
          mfaEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        versions: [
          {
            id: 'ver-uuid-1',
            documentId: 'doc-uuid-1',
            versionNo: 1,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v1.pdf',
            sha256: 'hash-v1',
            sizeBytes: 1024n,
            mimeType: 'application/pdf',
            uploadedById: mockUser.id,
            createdAt: new Date(),
          },
          {
            id: 'ver-uuid-2',
            documentId: 'doc-uuid-1',
            versionNo: 2,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v2.pdf',
            sha256: 'hash-v2',
            sizeBytes: 2048n,
            mimeType: 'application/pdf',
            uploadedById: mockUser.id,
            createdAt: new Date(),
          },
        ],
      };

      prisma.document.findUnique
        .mockResolvedValueOnce(existingDoc)
        .mockResolvedValueOnce(docWithV2);

      prisma.documentVersion.create.mockResolvedValue(docWithV2.versions[1]);

      const result = await service.uploadNewVersion('doc-uuid-1', sampleFile, mockUser);

      expect(result).toBeDefined();
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('v2-forensic_report.pdf'),
        expect.any(Buffer),
        'application/pdf',
        expect.any(Object),
      );
      expect(prisma.documentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ versionNo: 2 }),
        }),
      );
    });
  });

  describe('verifyIntegrity', () => {
    it('should return verified true when re-computed storage hash matches database', async () => {
      const storedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const doc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        case: mockCase,
        versions: [
          {
            versionNo: 1,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v1.pdf',
            sha256: storedHash,
          },
        ],
      };

      prisma.document.findUnique.mockResolvedValue(doc);
      storageService.computeSha256.mockResolvedValue(storedHash);

      const result = await service.verifyIntegrity('doc-uuid-1', 1, mockUser);

      expect(result.verified).toBe(true);
      expect(result.tampered).toBe(false);
      expect(result.computedHash).toBe(storedHash);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCUMENT_INTEGRITY_VERIFIED',
        }),
      );
    });

    it('should return verified false and tampered true when computed hash does not match stored hash', async () => {
      const storedHash = 'original-unmodified-sha256-hash';
      const tamperedHash = 'tampered-modified-sha256-hash';
      const doc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        case: mockCase,
        versions: [
          {
            versionNo: 1,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v1.pdf',
            sha256: storedHash,
          },
        ],
      };

      prisma.document.findUnique.mockResolvedValue(doc);
      storageService.computeSha256.mockResolvedValue(tamperedHash);

      const result = await service.verifyIntegrity('doc-uuid-1', 1, mockUser);

      expect(result.verified).toBe(false);
      expect(result.tampered).toBe(true);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCUMENT_INTEGRITY_FAILED',
        }),
      );
    });
  });

  describe('download', () => {
    it('should stream document bytes and emit DOCUMENT_DOWNLOADED audit event', async () => {
      const doc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        title: 'Forensic Report',
        case: mockCase,
        versions: [
          {
            versionNo: 1,
            storageKey: 'cases/case-uuid-1/documents/doc-uuid-1/v1-forensic_report.pdf',
            sha256: 'sha256-hash',
            mimeType: 'application/pdf',
            sizeBytes: 1024n,
          },
        ],
      };

      prisma.document.findUnique.mockResolvedValue(doc);

      const download = await service.download('doc-uuid-1', 1, mockUser);

      expect(download.stream).toBeDefined();
      expect(download.mimeType).toBe('application/pdf');
      expect(download.filename).toBe('v1-forensic_report.pdf');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCUMENT_DOWNLOADED',
        }),
      );
    });

    it('should throw ForbiddenException if user only has VIEW_ONLY share clearance', async () => {
      const doc = {
        id: 'doc-uuid-1',
        caseId: 'case-uuid-1',
        title: 'Forensic Report',
        case: mockCase,
        versions: [
          {
            versionNo: 1,
            storageKey: 'k',
            sha256: 'h',
            mimeType: 'application/pdf',
            sizeBytes: 100n,
          },
        ],
      };
      prisma.document.findUnique.mockResolvedValue(doc);
      policyService.canAccessDocument.mockResolvedValue({
        granted: true,
        scope: 'VIEW_ONLY',
        shareId: 'share-1',
      });

      await expect(service.download('doc-uuid-1', 1, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
