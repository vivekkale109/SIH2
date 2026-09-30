process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Audit Ledger & Integrity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let auditorAccessToken: string;
  let investigatorAccessToken: string;

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

    // 1. Authenticate Admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@sdms.gov.in',
        password: 'Secure#Demo2026!',
      })
      .expect(200);
    adminAccessToken = adminRes.body.tokens.accessToken;

    // 2. Authenticate Auditor
    const auditorRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'auditor@vigilance.gov.in',
        password: 'Secure#Demo2026!',
      })
      .expect(200);
    auditorAccessToken = auditorRes.body.tokens.accessToken;

    // 3. Authenticate Investigator
    const invRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'investigator@police.gov.in',
        password: 'Secure#Demo2026!',
      })
      .expect(200);
    investigatorAccessToken = invRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/audit/verify-chain', () => {
    it('should deny unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/audit/verify-chain').expect(401);
    });

    it('should deny unauthorized INVESTIGATOR with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${investigatorAccessToken}`)
        .expect(403);
    });

    it('should allow AUDITOR to verify chain with valid=true on clean data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${auditorAccessToken}`)
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.totalEntries).toBeGreaterThanOrEqual(1);
      expect(res.body.lastSequence).toBeGreaterThanOrEqual(1);
      expect(res.body.checkedAt).toBeDefined();
    });

    it('should allow ADMIN to verify chain', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.valid).toBe(true);
    });
  });

  describe('GET /api/v1/audit', () => {
    it('should deny INVESTIGATOR from viewing ledger entries', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${investigatorAccessToken}`)
        .expect(403);
    });

    it('should allow AUDITOR to list and paginate ledger entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit?limit=10&page=1')
        .set('Authorization', `Bearer ${auditorAccessToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      const entry = res.body.items[0];
      expect(entry.sequence).toBeDefined();
      expect(entry.prevHash).toBeDefined();
      expect(entry.entryHash).toBeDefined();
      expect(entry.action).toBeDefined();
    });

    it('should filter entries by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit?action=LOGIN_SUCCESS')
        .set('Authorization', `Bearer ${auditorAccessToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      for (const item of res.body.items) {
        expect(item.action).toBe('LOGIN_SUCCESS');
      }
    });
  });

  describe('Cryptographic Tamper Detection', () => {
    it('should immediately detect simulated database row tampering', async () => {
      // Find the last ledger entry in the database
      const lastEntry = await prisma.auditLedger.findFirst({
        orderBy: { sequence: 'desc' },
      });
      expect(lastEntry).toBeDefined();

      if (!lastEntry) return;

      const originalAction = lastEntry.action;

      try {
        // Direct database tamper: modify the action without recalculating entryHash
        await prisma.auditLedger.update({
          where: { id: lastEntry.id },
          data: { action: 'UNAUTHORIZED_TAMPERED_ACTION' },
        });

        // Call verification endpoint as auditor
        const verifyRes = await request(app.getHttpServer())
          .get('/api/v1/audit/verify-chain')
          .set('Authorization', `Bearer ${auditorAccessToken}`)
          .expect(200);

        expect(verifyRes.body.valid).toBe(false);
        expect(verifyRes.body.corruptedAtSequence).toBe(Number(lastEntry.sequence));
        expect(verifyRes.body.message).toMatch(/tampering detected/i);
      } finally {
        // Restore original state
        await prisma.auditLedger.update({
          where: { id: lastEntry.id },
          data: { action: originalAction },
        });
      }

      // Re-verify after restoring to ensure ledger is valid again
      const restoredRes = await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${auditorAccessToken}`)
        .expect(200);

      expect(restoredRes.body.valid).toBe(true);
    });
  });
});
