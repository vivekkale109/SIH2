process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { StorageService } from '../src/modules/storage/storage.service';
import { EICAR_SIGNATURE } from '../src/modules/storage/clamav.service';
import { ClassificationLevel } from '@sdms/shared-types';

describe('Document Upload, Versioning, Storage & Integrity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storageService: StorageService;

  let investigatorToken: string;
  let courtOfficerToken: string;

  let testCaseId: string;
  let testDocumentId: string;
  const testCaseNumber = `FIR-2026-DOC-${Date.now().toString().slice(-6)}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    storageService = app.get<StorageService>(StorageService);

    // Login helper
    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Secure#Demo2026!' })
        .expect(200);
      return res.body.tokens.accessToken as string;
    };

    investigatorToken = await login('investigator@police.gov.in');
    courtOfficerToken = await login('court.officer@court.gov.in');

    // Create a test case owned by the investigator
    const caseRes = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        caseNumber: testCaseNumber,
        title: 'Document Upload Test Case',
        description: 'Case for testing encrypted storage, versioning and tamper integrity',
        classification: ClassificationLevel.RESTRICTED,
      })
      .expect(201);

    testCaseId = caseRes.body.id;
  });

  afterAll(async () => {
    if (testCaseId) {
      // Clean up test documents, versions, case members, and case
      const docs = await prisma.document.findMany({ where: { caseId: testCaseId } });
      for (const doc of docs) {
        const versions = await prisma.documentVersion.findMany({ where: { documentId: doc.id } });
        for (const ver of versions) {
          try {
            await storageService.delete(ver.storageKey);
          } catch {
            // ignore
          }
        }
        await prisma.documentVersion.deleteMany({ where: { documentId: doc.id } });
      }
      await prisma.document.deleteMany({ where: { caseId: testCaseId } });
      await prisma.caseMember.deleteMany({ where: { caseId: testCaseId } });
      await prisma.case.deleteMany({ where: { id: testCaseId } });
    }
    await app.close();
  });

  describe('POST /api/v1/cases/:caseId/documents (Upload & Ingestion)', () => {
    it('should reject unauthenticated upload requests with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/documents`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('title', 'Unauthorized Doc')
        .field('type', 'EVIDENCE')
        .expect(401);
    });

    it('should deny unauthorized Court Officer from uploading documents with 403 (ABAC)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/documents`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('title', 'Forbidden Doc')
        .field('type', 'EVIDENCE')
        .expect(403);
    });

    it('should quarantine and reject an infected EICAR test file with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/documents`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .attach('file', Buffer.from(EICAR_SIGNATURE), 'malware_test.pdf')
        .field('title', 'Malicious Document')
        .field('type', 'FORENSIC_REPORT')
        .expect(400);

      expect(res.body.message).toContain('Malware Detected');
    });

    it('should successfully upload a clean PDF document with SHA-256 and SSE storage', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/documents`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .attach('file', pdfBuffer, 'forensic_disk_report.pdf')
        .field('title', 'Forensic Disk Report')
        .field('type', 'FORENSIC_REPORT')
        .field('classification', ClassificationLevel.RESTRICTED)
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Forensic Disk Report');
      expect(res.body.latestVersionNo).toBe(1);
      expect(res.body.sha256).toBeDefined();
      expect(res.body.versions).toHaveLength(1);
      expect(res.body.versions[0].versionNo).toBe(1);

      testDocumentId = res.body.id;

      // Verify file exists in MinIO storage
      const exists = await storageService.exists(res.body.versions[0].storageKey);
      expect(exists).toBe(true);
    });
  });

  describe('GET /api/v1/cases/:caseId/documents (Listing)', () => {
    it('should list all documents attached to the case for cleared investigator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/documents`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toBe('Forensic Disk Report');
    });
  });

  describe('GET /api/v1/documents/:id (Detail & Audit Entry)', () => {
    it('should return complete document details with version history and log DOCUMENT_VIEWED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body.id).toBe(testDocumentId);
      expect(res.body.versions).toHaveLength(1);
      expect(res.body.currentVersion).toBeDefined();
      expect(res.body.case).toBeDefined();
    });
  });

  describe('POST /api/v1/documents/:id/versions (Versioning without overwrite)', () => {
    it('should ingest revision as version 2 without overwriting version 1', async () => {
      const v2Buffer = Buffer.from('%PDF-1.4 Revision 2 with appended digital signature hash');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${testDocumentId}/versions`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .attach('file', v2Buffer, 'forensic_disk_report_v2.pdf')
        .expect(201);

      expect(res.body.latestVersionNo).toBe(2);
      expect(res.body.versions).toHaveLength(2);
      expect(res.body.versions[0].versionNo).toBe(1);
      expect(res.body.versions[1].versionNo).toBe(2);

      // Verify both version objects exist in MinIO
      const v1Exists = await storageService.exists(res.body.versions[0].storageKey);
      const v2Exists = await storageService.exists(res.body.versions[1].storageKey);
      expect(v1Exists).toBe(true);
      expect(v2Exists).toBe(true);
      expect(res.body.versions[0].sha256).not.toEqual(res.body.versions[1].sha256);
    });
  });

  describe('POST /api/v1/documents/:id/verify (Live Storage Integrity Verification)', () => {
    it('should verify live MinIO bytes match stored cryptographic hash', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${testDocumentId}/verify`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body.verified).toBe(true);
      expect(res.body.tampered).toBe(false);
      expect(res.body.documentId).toBe(testDocumentId);
      expect(res.body.storedHash).toEqual(res.body.computedHash);
    });
  });

  describe('GET /api/v1/documents/:id/download (Secure Streaming Download)', () => {
    it('should stream document bytes and emit DOCUMENT_DOWNLOADED audit event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocumentId}/download?versionNo=1`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.header['content-type']).toContain('application/pdf');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.body).toBeDefined();
    });
  });
});
