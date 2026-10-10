process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import JSZip from 'jszip';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClassificationLevel } from '@sdms/shared-types';

describe('Signed Exports & Court Evidence Verifier (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let investigatorToken: string;
  let prosecutorToken: string;

  let testCaseId: string;
  let testDocId: string;
  let exportPackageId: string;
  let exportZipBuffer: Buffer;
  const testCaseNumber = `FIR-EXPORT-${Date.now().toString().slice(-6)}`;

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
    prosecutorToken = await login('prosecutor@prosecution.gov.in');

    // 1. Create a test case
    const caseRes = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        caseNumber: testCaseNumber,
        title: 'High Court Evidence Export Proceeding',
        description: 'Investigation case prepared for formal court export under BSA 2023',
        classification: ClassificationLevel.RESTRICTED,
      })
      .expect(201);

    testCaseId = caseRes.body.id as string;

    // 2. Upload an evidence document
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/cases/${testCaseId}/documents`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach(
        'file',
        Buffer.from('Forensic Laboratory Physical Seizure Certificate #4412'),
        'Seizure_Certificate.txt',
      )
      .field('title', 'Seizure Certificate 4412')
      .field('type', 'SEIZURE_MEMO')
      .field('classification', ClassificationLevel.RESTRICTED)
      .expect(201);

    testDocId = uploadRes.body.id as string;
  });

  afterAll(async () => {
    if (exportPackageId) {
      await prisma.exportPackage.deleteMany({ where: { id: exportPackageId } }).catch(() => {});
    }
    if (testDocId) {
      await prisma.document.deleteMany({ where: { id: testDocId } }).catch(() => {});
    }
    if (testCaseId) {
      await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    }
    await app.close();
  });

  it('1. should reject export creation if password confirmation is wrong', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${testCaseId}/exports`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        passwordConfirm: 'IncorrectPassword!',
      })
      .expect(403);
  });

  it('2. should create court-ready signed export package with Ed25519 signature & BSA 2023 certificate', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/cases/${testCaseId}/exports`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        passwordConfirm: 'Secure#Demo2026!',
        notes: 'Submitted for judicial inspection in Sessions Court No. 4',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.manifestHash).toBeDefined();
    expect(res.body.signature).toBeDefined();
    expect(res.body.documentCount).toBe(1);
    expect(res.body.createdBy.fullName).toBeDefined();

    exportPackageId = res.body.id as string;

    // Verify audit ledger entry was recorded
    const ledger = await prisma.auditLedger.findFirst({
      where: {
        action: 'EXPORT_CREATED',
        entityId: exportPackageId,
      },
    });
    expect(ledger).toBeDefined();
  });

  it('3. should list generated export packages for the case', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/cases/${testCaseId}/exports`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].id).toBe(exportPackageId);
  });

  it('4. should download signed export package (ZIP archive)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/exports/${exportPackageId}/download`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.header['content-type']).toContain('application/zip');
    exportZipBuffer = res.body as Buffer;
    expect(Buffer.isBuffer(exportZipBuffer)).toBe(true);
    expect(exportZipBuffer.length).toBeGreaterThan(0);

    // Verify EXPORT_DOWNLOADED audit entry
    const downloadLedger = await prisma.auditLedger.findFirst({
      where: {
        action: 'EXPORT_DOWNLOADED',
        entityId: exportPackageId,
      },
    });
    expect(downloadLedger).toBeDefined();
  });

  it('5. should verify authentic downloaded package as VALID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/exports/verify')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach('package', exportZipBuffer, 'evidence_package.zip')
      .expect(200);

    expect(res.body.verified).toBe(true);
    expect(res.body.status).toBe('VALID');
    expect(res.body.signatureValid).toBe(true);
    expect(res.body.manifestHashValid).toBe(true);
    expect(res.body.auditChainValid).toBe(true);
    expect(res.body.documentsChecked.length).toBe(1);
    expect(res.body.documentsChecked[0].match).toBe(true);
    expect(res.body.certificateText).toContain('CERTIFICATE OF ELECTRONIC EVIDENCE');
    expect(res.body.certificateText).toContain('Bharatiya Sakshya Adhiniyam, 2023');

    // Verify EXPORT_VERIFIED ledger record
    const verifyLedger = await prisma.auditLedger.findFirst({
      where: {
        action: 'EXPORT_VERIFIED',
        entityId: exportPackageId,
      },
    });
    expect(verifyLedger).toBeDefined();
  });

  it('6. should detect exhibit modification and flag status as TAMPERED_DOCUMENT', async () => {
    const zip = await JSZip.loadAsync(exportZipBuffer);

    // Locate document file inside ZIP and replace with altered content
    const docFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith('documents/') && !f.endsWith('/') && !zip.files[f]?.dir,
    );
    expect(docFiles.length).toBeGreaterThan(0);

    zip.file(docFiles[0]!, Buffer.from('TAMPERED EVIDENCE BYTES!'));
    const tamperedZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/exports/verify')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach('package', tamperedZipBuffer, 'tampered_package.zip')
      .expect(200);

    expect(res.body.verified).toBe(false);
    expect(res.body.status).toBe('TAMPERED_DOCUMENT');
    expect(res.body.documentsChecked[0].match).toBe(false);
    expect(res.body.errors.some((e: string) => e.includes('hash mismatch'))).toBe(true);
  });

  it('7. should detect manifest modification and flag status as TAMPERED_MANIFEST', async () => {
    const zip = await JSZip.loadAsync(exportZipBuffer);

    const manifestFile = zip.file('manifest.json');
    expect(manifestFile).toBeDefined();

    const manifestStr = await manifestFile!.async('text');
    const manifestObj = JSON.parse(manifestStr);

    // Modify a field inside manifest
    manifestObj.case.title = 'Substituted Fake Title';
    zip.file('manifest.json', JSON.stringify(manifestObj, null, 2));

    const tamperedZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/exports/verify')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .attach('package', tamperedZipBuffer, 'tampered_manifest.zip')
      .expect(200);

    expect(res.body.verified).toBe(false);
    expect(res.body.status).toBe('TAMPERED_MANIFEST');
    expect(res.body.manifestHashValid).toBe(false);
    expect(
      res.body.errors.some((e: string) => e.includes('Manifest hash verification failed')),
    ).toBe(true);
  });
});
