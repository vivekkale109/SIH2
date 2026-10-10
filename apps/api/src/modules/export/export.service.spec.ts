import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { PolicyService } from '../cases/policy/policy.service';
import { SignerService } from './services/signer.service';
import { CertificateService } from './services/certificate.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { UserRole, ClassificationLevel } from '@sdms/shared-types';
import crypto from 'crypto';
import JSZip from 'jszip';

describe('ExportService', () => {
  let exportService: ExportService;
  let signerService: SignerService;
  let certificateService: CertificateService;

  const mockCaseId = 'case-uuid-1111';
  const mockDocId = 'doc-uuid-2222';
  const mockFileContent = Buffer.from('Official investigative seizure report text content');
  const mockSha256 = crypto.createHash('sha256').update(mockFileContent).digest('hex');

  const mockUser: AuthenticatedUser = {
    id: 'user-investigator-1',
    email: 'investigator@police.gov.in',
    role: UserRole.INVESTIGATOR,
    departmentId: 'POL-CCB',
    authTime: Math.floor(Date.now() / 1000) - 60, // Authenticated 1 minute ago
    badgeNumber: 'POL-4412',
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        fullName: 'Inspector Rajesh Sharma',
        role: mockUser.role,
        departmentId: mockUser.departmentId,
        badgeNumber: mockUser.badgeNumber,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
      }),
    },
    case: {
      findUnique: jest.fn().mockResolvedValue({
        id: mockCaseId,
        caseNumber: 'FIR-2026-DEL-0042',
        title: 'Cyber Fraud Investigation',
        classification: ClassificationLevel.RESTRICTED,
        departmentId: 'POL-CCB',
        department: { name: 'Central Crime Branch' },
        createdBy: { id: mockUser.id, fullName: 'Inspector Rajesh Sharma' },
      }),
    },
    document: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: mockDocId,
          caseId: mockCaseId,
          title: 'Seizure Memo 01',
          type: 'SEIZURE_MEMO',
          classification: ClassificationLevel.RESTRICTED,
          versions: [
            {
              id: 'ver-1',
              versionNo: 1,
              sha256: mockSha256,
              sizeBytes: mockFileContent.length,
              mimeType: 'text/plain',
              storageKey: `cases/${mockCaseId}/documents/${mockDocId}/v1-memo.txt`,
            },
          ],
        },
      ]),
    },
    auditLedger: {
      findMany: jest.fn().mockResolvedValue([
        {
          sequence: BigInt(1),
          timestamp: new Date('2026-09-30T10:00:00Z'),
          actorId: mockUser.id,
          action: 'CASE_CREATED',
          entityType: 'Case',
          entityId: mockCaseId,
          prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
          entryHash: 'e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1',
        },
      ]),
    },
    exportPackage: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
          createdAt: new Date(),
          createdBy: {
            id: mockUser.id,
            fullName: 'Inspector Rajesh Sharma',
            email: mockUser.email,
            role: mockUser.role,
            departmentId: mockUser.departmentId,
            badgeNumber: mockUser.badgeNumber,
            isActive: true,
            mfaEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      ),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(true),
  };

  const mockStorage = {
    getBuffer: jest.fn().mockResolvedValue(mockFileContent),
    upload: jest.fn().mockResolvedValue('exports/pkg.zip'),
    getStream: jest.fn(),
  };

  const mockPolicy = {
    canExportCase: jest.fn().mockResolvedValue(true),
    canAccessCase: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        SignerService,
        CertificateService,
        ConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: StorageService, useValue: mockStorage },
        { provide: PolicyService, useValue: mockPolicy },
      ],
    }).compile();

    exportService = module.get<ExportService>(ExportService);
    signerService = module.get<SignerService>(SignerService);
    certificateService = module.get<CertificateService>(CertificateService);
    signerService.onModuleInit();
  });

  it('should compile, hash, digitally sign with Ed25519, and store an evidence export package', async () => {
    const result = await exportService.createExport(
      mockCaseId,
      { notes: 'Forensic court exhibit preparation' },
      mockUser,
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.caseId).toBe(mockCaseId);
    expect(result.manifestHash).toBeDefined();
    expect(result.signature).toBeDefined();
    expect(result.documentCount).toBe(1);

    // Verify storage upload was called
    expect(mockStorage.upload).toHaveBeenCalled();

    // Verify EXPORT_CREATED audit entry was logged
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT_CREATED',
        entityType: 'ExportPackage',
      }),
    );
  });

  it('should verify an authentic export package offline as VALID', async () => {
    // Generate valid ZIP archive
    const pubKey = signerService.getPublicKeyPem();
    const packageId = crypto.randomUUID();

    const manifestPayload = {
      manifestVersion: '1.0.0',
      packageId,
      case: {
        id: mockCaseId,
        caseNumber: 'FIR-2026-DEL-0042',
        title: 'Cyber Fraud Investigation',
        classification: 'RESTRICTED',
        departmentId: 'POL-CCB',
      },
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: mockUser.id,
        fullName: 'Inspector Rajesh Sharma',
        email: mockUser.email,
        role: mockUser.role,
        departmentId: mockUser.departmentId,
      },
      evidenceCertificate: {
        statutoryBasis: 'Bharatiya Sakshya Adhiniyam, 2023',
        certificationDate: new Date().toISOString(),
        declarantName: 'Inspector Rajesh Sharma',
        declarantDesignation: 'INVESTIGATOR',
        declarantDepartment: 'POL-CCB',
        caseNumber: 'FIR-2026-DEL-0042',
        systemName: 'SDMS',
        hashAlgorithm: 'SHA-256 with Ed25519',
        statement: 'Formal evidence declaration under BSA 2023 §63',
      },
      documents: [
        {
          id: mockDocId,
          title: 'Seizure Memo 01',
          type: 'SEIZURE_MEMO',
          classification: 'RESTRICTED',
          versionNo: 1,
          relativePath: 'documents/memo.txt',
          sha256: mockSha256,
          sizeBytes: mockFileContent.length,
          mimeType: 'text/plain',
        },
      ],
      auditTrail: [],
    };

    // Helper deterministic canonical JSON
    const canonicalJson = (obj: any): string => {
      if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
      if (Array.isArray(obj)) return '[' + obj.map((i) => canonicalJson(i)).join(',') + ']';
      const keys = Object.keys(obj).sort();
      return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',') + '}';
    };

    const canonicalManifest = canonicalJson(manifestPayload);
    const manifestHash = crypto.createHash('sha256').update(canonicalManifest).digest('hex');
    const { signature } = signerService.signData(manifestHash);

    const fullManifest = {
      ...manifestPayload,
      manifestHash,
      signature,
      publicKey: pubKey,
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(fullManifest, null, 2));
    zip.file('documents/memo.txt', mockFileContent);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Verify package
    const verification = await exportService.verifyPackage(zipBuffer, mockUser);

    expect(verification.verified).toBe(true);
    expect(verification.status).toBe('VALID');
    expect(verification.signatureValid).toBe(true);
    expect(verification.manifestHashValid).toBe(true);
    expect(verification.documentsChecked[0]?.match).toBe(true);
  });

  it('should detect file tampering and mark status as TAMPERED_DOCUMENT', async () => {
    const pubKey = signerService.getPublicKeyPem();
    const packageId = crypto.randomUUID();

    const manifestPayload = {
      manifestVersion: '1.0.0',
      packageId,
      case: {
        id: mockCaseId,
        caseNumber: 'FIR-2026-DEL-0042',
        title: 'Cyber Fraud Investigation',
        classification: 'RESTRICTED',
        departmentId: 'POL-CCB',
      },
      exportedAt: new Date().toISOString(),
      documents: [
        {
          id: mockDocId,
          title: 'Seizure Memo 01',
          type: 'SEIZURE_MEMO',
          classification: 'RESTRICTED',
          versionNo: 1,
          relativePath: 'documents/memo.txt',
          sha256: mockSha256,
          sizeBytes: mockFileContent.length,
          mimeType: 'text/plain',
        },
      ],
      auditTrail: [],
    };

    const canonicalJson = (obj: any): string => {
      if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
      if (Array.isArray(obj)) return '[' + obj.map((i) => canonicalJson(i)).join(',') + ']';
      const keys = Object.keys(obj).sort();
      return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',') + '}';
    };

    const canonicalManifest = canonicalJson(manifestPayload);
    const manifestHash = crypto.createHash('sha256').update(canonicalManifest).digest('hex');
    const { signature } = signerService.signData(manifestHash);

    const fullManifest = {
      ...manifestPayload,
      manifestHash,
      signature,
      publicKey: pubKey,
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(fullManifest, null, 2));
    // Embed altered file content
    zip.file('documents/memo.txt', Buffer.from('Altered / substituted content!'));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const verification = await exportService.verifyPackage(zipBuffer, mockUser);

    expect(verification.verified).toBe(false);
    expect(verification.status).toBe('TAMPERED_DOCUMENT');
    expect(verification.documentsChecked[0]?.match).toBe(false);
  });
});
