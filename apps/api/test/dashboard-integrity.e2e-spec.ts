import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { UserRole, AuditAction } from '@sdms/shared-types';

import cookieParser from 'cookie-parser';

describe('Phase 8 — Dashboards, Audit Log Explorer & Integrity Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let investigatorToken: string;
  let prosecutorToken: string;
  let auditorToken: string;
  let recordsManagerToken: string;
  let courtOfficerToken: string;

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
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Helper to log in and get JWT token
    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Secure#Demo2026!' })
        .expect(200);
      return res.body.tokens.accessToken as string;
    };

    adminToken = await login('admin@sdms.gov.in');
    investigatorToken = await login('investigator@police.gov.in');
    prosecutorToken = await login('prosecutor@prosecution.gov.in');
    auditorToken = await login('auditor@vigilance.gov.in');
    recordsManagerToken = await login('records@sdms.gov.in');
    courtOfficerToken = await login('court.officer@court.gov.in');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/dashboard/stats', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/v1/dashboard/stats').expect(401);
    });

    it('should return aggregated stats for Investigator with recent cases and active shares', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.overview).toBeDefined();
      expect(typeof res.body.overview.totalCases).toBe('number');
      expect(typeof res.body.overview.totalDocuments).toBe('number');
      expect(typeof res.body.overview.auditChainValid).toBe('boolean');
      expect(res.body.overview.auditChainValid).toBe(true);
      expect(Array.isArray(res.body.recentCases)).toBe(true);
      expect(Array.isArray(res.body.expiringShares)).toBe(true);
      expect(Array.isArray(res.body.recentAuditLogs)).toBe(true);
      expect(res.body.classificationCounts).toBeDefined();
      expect(typeof res.body.classificationCounts.RESTRICTED).toBe('number');
    });

    it('should return system-wide operational metrics for Auditor', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.overview.auditLedgerTotal).toBeGreaterThanOrEqual(1);
      expect(res.body.overview.auditChainValid).toBe(true);
      expect(res.body.recentAuditLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return global overview metrics for Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.overview.totalCases).toBeGreaterThanOrEqual(0);
      expect(res.body.overview.auditChainValid).toBe(true);
    });
  });

  describe('GET /api/v1/audit/verify-chain', () => {
    it('should allow Auditor to verify cryptographic chain integrity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.totalEntries).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.lastSequence).toBe('number');
      expect(res.body.checkedAt).toBeDefined();
    });

    it('should allow Admin to verify chain integrity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.valid).toBe(true);
    });

    it('should DENY Investigator from verifying chain directly with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit/verify-chain')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/audit (Advanced Log Explorer)', () => {
    it('should allow Auditor to query audit entries with pagination and filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit?page=1&limit=10')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);

      // Verify cryptographic structure of entries
      const firstEntry = res.body.items[0];
      expect(firstEntry.id).toBeDefined();
      expect(typeof firstEntry.sequence).toBe('number');
      expect(firstEntry.prevHash).toHaveLength(64);
      expect(firstEntry.entryHash).toHaveLength(64);
      expect(firstEntry.action).toBeDefined();
      expect(firstEntry.actorId).toBeDefined();
    });

    it('should filter audit entries by action', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/audit?action=${AuditAction.LOGIN_SUCCESS}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      res.body.items.forEach((item: any) => {
        expect(item.action).toBe(AuditAction.LOGIN_SUCCESS);
      });
    });

    it('should filter audit entries by entityType', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit?entityType=User')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      res.body.items.forEach((item: any) => {
        expect(item.entityType).toBe('User');
      });
    });

    it('should DENY Investigator from querying audit ledger with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/departments', () => {
    it('should list all departments for authenticated users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const dept = res.body[0];
      expect(dept.name).toBeDefined();
      expect(dept.code).toBeDefined();
      expect(dept.type).toBeDefined();
    });
  });
});
