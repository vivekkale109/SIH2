process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClassificationLevel, ShareScope } from '@sdms/shared-types';

describe('Controlled Sharing & Forensic Watermarking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let investigatorToken: string;
  let courtOfficerToken: string;
  let prosecutorToken: string;

  let testCaseId: string;
  let testDocId: string;
  let courtOfficerId: string;
  const testCaseNumber = `FIR-SHARE-${Date.now().toString().slice(-6)}`;

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
    prosecutorToken = await login('prosecutor@prosecution.gov.in');

    const courtUser = await prisma.user.findUnique({
      where: { email: 'court.officer@court.gov.in' },
    });
    courtOfficerId = courtUser!.id;

    // 1. Create a test case owned by investigator
    const caseRes = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        caseNumber: testCaseNumber,
        title: 'Confidential Syndicate Sharing Probe',
        description: 'Cross-jurisdictional evidence case',
        classification: ClassificationLevel.CONFIDENTIAL,
      })
      .expect(201);

    testCaseId = caseRes.body.id as string;

    // 2. Upload an evidence document
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/cases/${testCaseId}/documents`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach(
        'file',
        Buffer.from(
          'FORENSIC LAB SEIZURE MEMO\nCrypto Wallets Seized: 2 Ledger Nano X\nEncrypted seeds recovered.\nConfidential chain analysis report.',
        ),
        'seizure-memo.txt',
      )
      .field('title', 'Hardware Wallet Seizure Memo')
      .field('type', 'SEIZURE_MEMO')
      .field('classification', ClassificationLevel.CONFIDENTIAL)
      .expect(201);

    testDocId = uploadRes.body.id as string;
  });

  afterAll(async () => {
    if (testCaseId) {
      await prisma.shareGrant.deleteMany({
        where: { OR: [{ resourceId: testCaseId }, { resourceId: testDocId }] },
      });
      await prisma.document.deleteMany({ where: { caseId: testCaseId } });
      await prisma.case.deleteMany({ where: { id: testCaseId } });
    }
    await app.close();
  });

  describe('Controlled Sharing & Access Enforcement', () => {
    let viewOnlyShareId: string;
    let downloadShareId: string;

    it('should reject access to document before share grant is created', async () => {
      // Court officer is outside police department and not member of case
      await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);
    });

    it('should create a VIEW_ONLY share grant to Court Officer', async () => {
      const expiresAt = new Date(Date.now() + 2 * 86400000).toISOString(); // 2 days in future

      const res = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          resourceType: 'DOCUMENT',
          resourceId: testDocId,
          granteeId: courtOfficerId,
          scope: ShareScope.VIEW_ONLY,
          expiresAt,
          passwordConfirm: 'Secure#Demo2026!',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.scope).toBe(ShareScope.VIEW_ONLY);
      expect(res.body.isExpired).toBe(false);
      expect(res.body.isRevoked).toBe(false);
      viewOnlyShareId = res.body.id as string;
    });

    it('should allow Court Officer to inspect the shared resource', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/shares/${viewOnlyShareId}/access`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(200);

      expect(res.body.share.id).toBe(viewOnlyShareId);
      expect(res.body.resource.title).toBe('Hardware Wallet Seizure Memo');
    });

    it('should allow Court Officer to inspect document details and preview watermarked stream', async () => {
      // Can view document metadata
      const docRes = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(200);

      expect(docRes.body.id).toBe(testDocId);

      // Can stream watermarked preview
      const previewRes = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/preview`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(200);

      expect(previewRes.text).toContain('FORENSIC ACCESS RECORD');
      expect(previewRes.text).toContain('court.officer@court.gov.in');
    });

    it('should reject file download for VIEW_ONLY scope with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/download`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);

      expect(res.body.message).toContain('VIEW_ONLY');
    });

    it('should create a DOWNLOAD share grant and allow watermarked download', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const shareRes = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          resourceType: 'DOCUMENT',
          resourceId: testDocId,
          granteeId: courtOfficerId,
          scope: ShareScope.DOWNLOAD,
          expiresAt,
          passwordConfirm: 'Secure#Demo2026!',
        })
        .expect(201);

      downloadShareId = shareRes.body.id as string;

      // Now downloading is allowed with watermark
      const downloadRes = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/download`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(200);

      expect(downloadRes.text).toContain('FORENSIC ACCESS RECORD');
      expect(downloadRes.text).toContain('court.officer@court.gov.in');
    });

    it('should immediately revoke share and block access with 403 Forbidden', async () => {
      // Revoke the download share
      await request(app.getHttpServer())
        .delete(`/api/v1/shares/${downloadShareId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      // Revoke the view-only share too
      await request(app.getHttpServer())
        .delete(`/api/v1/shares/${viewOnlyShareId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      // Accessing share endpoint gives 403 immediately
      await request(app.getHttpServer())
        .get(`/api/v1/shares/${downloadShareId}/access`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);

      // Accessing document gives 403 immediately
      await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);
    });

    it('should reject unauthorized third party attempting to access a share grant', async () => {
      // Create share for Court Officer
      const shareRes = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          resourceType: 'DOCUMENT',
          resourceId: testDocId,
          granteeId: courtOfficerId,
          scope: ShareScope.VIEW_ONLY,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          passwordConfirm: 'Secure#Demo2026!',
        })
        .expect(201);

      const sId = shareRes.body.id as string;

      // Prosecutor was not granted this share
      await request(app.getHttpServer())
        .get(`/api/v1/shares/${sId}/access`)
        .set('Authorization', `Bearer ${prosecutorToken}`)
        .expect(403);

      // Cleanup
      await prisma.shareGrant.delete({ where: { id: sId } });
    });
  });
});
