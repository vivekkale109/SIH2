process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClassificationLevel, DocumentStatus } from '@sdms/shared-types';

describe('OCR Intelligence, Verification & Search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let investigatorToken: string;
  let courtOfficerToken: string;

  let testCaseId: string;
  let testDocId: string;
  const testCaseNumber = `FIR-OCR-${Date.now().toString().slice(-6)}`;

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

    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Secure#Demo2026!' })
        .expect(200);
      return res.body.tokens.accessToken as string;
    };

    investigatorToken = await login('investigator@police.gov.in');
    courtOfficerToken = await login('court.officer@court.gov.in');

    // Create a test case owned by investigator
    const caseRes = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        caseNumber: testCaseNumber,
        title: 'Cyber Heist Investigation',
        description: 'Case regarding digital forensics and evidence',
        classification: ClassificationLevel.CONFIDENTIAL,
      })
      .expect(201);

    testCaseId = caseRes.body.id as string;

    // Upload an evidence document
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/cases/${testCaseId}/documents`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach(
        'file',
        Buffer.from(
          'FIRST INFORMATION REPORT\nUnder Section 154 CrPC\nFIR No: 991/2026\nPolice Station: Cyber Crime Cell\nComplainant: Axis Bank Security\nAccused: Dark Web Syndicate\nRecovered 50 Bitcoins.',
        ),
        'fir-report.txt',
      )
      .field('title', 'FIR Cyber Bank Intrusion')
      .field('type', 'FIR')
      .field('classification', ClassificationLevel.CONFIDENTIAL)
      .expect(201);

    testDocId = uploadRes.body.id as string;
  });

  afterAll(async () => {
    if (testCaseId) {
      await prisma.document.deleteMany({ where: { caseId: testCaseId } });
      await prisma.case.deleteMany({ where: { id: testCaseId } });
    }
    await app.close();
  });

  describe('GET /api/v1/documents/:id/ocr', () => {
    it('should retrieve OCR state for authorized investigator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/ocr`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body.documentId).toBe(testDocId);
      expect(res.body.status).toBeDefined();
    });

    it('should reject unauthorized user trying to view OCR for confidential case', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/ocr`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/documents/:id/ocr/retry', () => {
    it('should allow investigator to manually trigger or retry OCR processing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${testDocId}/ocr/retry`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(DocumentStatus.PROCESSING);
    });
  });

  describe('PATCH /api/v1/documents/:id/ocr/verify', () => {
    it('should allow human verification and transcription correction', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/documents/${testDocId}/ocr/verify`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          extractedText:
            'FIRST INFORMATION REPORT (VERIFIED)\nUnder Section 154 CrPC\nFIR No: 991/2026\nComplainant: Axis Bank Official\nAccused: Dark Web Syndicate',
          type: 'FIR',
          extractedMetadata: {
            dates: ['2026-09-30'],
            caseNumbers: ['991/2026'],
            policeStation: 'Cyber Crime PS',
            entities: [{ role: 'Complainant', name: 'Axis Bank Official' }],
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.document.status).toBe(DocumentStatus.READY);
      expect(res.body.ocrResult.confidence).toBe(1.0);
      expect(res.body.ocrResult.verifiedById).toBeDefined();
      expect(res.body.ocrResult.extractedText).toContain('VERIFIED');
    });
  });

  describe('GET /api/v1/search', () => {
    it('should find documents by text keyword with highlighted snippets for authorized user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search')
        .query({ q: 'Syndicate' })
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body.results.length).toBeGreaterThanOrEqual(1);
      const match = res.body.results.find(
        (r: { documentId: string }) => r.documentId === testDocId,
      );
      expect(match).toBeDefined();
      expect(match.snippet).toContain('<mark>Syndicate</mark>');
    });

    it('should NEVER return confidential document to court officer without clearance (ABAC Rule SRCH-3)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search')
        .query({ q: 'Syndicate' })
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(200);

      const leak = res.body.results.find((r: { documentId: string }) => r.documentId === testDocId);
      expect(leak).toBeUndefined();
    });
  });
});
