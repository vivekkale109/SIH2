process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CaseStatus, ClassificationLevel, CaseMemberRole } from '@sdms/shared-types';

describe('Case Management & ABAC Enforcement (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let investigatorToken: string;
  let prosecutorToken: string;
  let courtOfficerToken: string;
  let recordsManagerToken: string;
  let auditorToken: string;

  let prosecutorUserId: string;
  let createdCaseId: string;
  const testCaseNumber = `FIR-2026-TEST-${Date.now().toString().slice(-6)}`;

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

    // Helper login
    const login = async (
      email: string,
    ): Promise<{ token: string; user: { id: string; role: string; departmentId: string } }> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Secure#Demo2026!' })
        .expect(200);
      return { token: res.body.tokens.accessToken as string, user: res.body.user };
    };

    const admin = await login('admin@sdms.gov.in');
    adminToken = admin.token;

    const inv = await login('investigator@police.gov.in');
    investigatorToken = inv.token;

    const pros = await login('prosecutor@prosecution.gov.in');
    prosecutorToken = pros.token;
    prosecutorUserId = pros.user.id;

    const court = await login('court.officer@court.gov.in');
    courtOfficerToken = court.token;

    const rec = await login('records@sdms.gov.in');
    recordsManagerToken = rec.token;

    const aud = await login('auditor@vigilance.gov.in');
    auditorToken = aud.token;
  });

  afterAll(async () => {
    // Clean up created test case
    if (createdCaseId) {
      await prisma.caseMember.deleteMany({ where: { caseId: createdCaseId } });
      await prisma.case.deleteMany({ where: { id: createdCaseId } });
    }
    await app.close();
  });

  describe('POST /api/v1/cases (Creation & Auto Lead Assignment)', () => {
    it('should deny unauthorized Court Officer from creating a case', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .send({
          caseNumber: `${testCaseNumber}-DENIED`,
          title: 'Unauthorized Case',
        })
        .expect(403);
    });

    it('should allow Investigator to create a case with RESTRICTED classification', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          caseNumber: testCaseNumber,
          title: 'Cyber Heist Syndicate Investigation',
          description: 'High-profile cross-border cyber intrusion',
          classification: ClassificationLevel.RESTRICTED,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.caseNumber).toBe(testCaseNumber);
      expect(res.body.status).toBe(CaseStatus.OPEN);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].caseRole).toBe(CaseMemberRole.LEAD_INVESTIGATOR);

      createdCaseId = res.body.id;
    });

    it('should reject duplicate case numbers with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          caseNumber: testCaseNumber,
          title: 'Duplicate Number Attempt',
        })
        .expect(409);
    });
  });

  describe('ABAC Clearance & Department Boundary Enforcement', () => {
    it('should allow Investigator (Creator & Lead) to fetch case details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdCaseId);
    });

    it('should allow Auditor to read case details globally for compliance checks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdCaseId);
    });

    it('should allow same department Records Manager to view RESTRICTED case', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${recordsManagerToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdCaseId);
    });

    it('should DENY Court Officer (different department, unassigned) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .expect(403);
    });

    it('should elevate classification to SECRET, then verify unassigned department members are denied', async () => {
      // 1. Elevate classification to SECRET by Lead Investigator
      await request(app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ classification: ClassificationLevel.SECRET })
        .expect(200);

      // 2. Same-department Records Manager should now be DENIED access because SECRET requires direct assignment
      await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${recordsManagerToken}`)
        .expect(403);
    });
  });

  describe('Case Member Management & Cross-Department Assignment', () => {
    it('should deny unassigned user from adding members', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/cases/${createdCaseId}/members`)
        .set('Authorization', `Bearer ${courtOfficerToken}`)
        .send({
          userId: prosecutorUserId,
          caseRole: CaseMemberRole.PROSECUTOR,
        })
        .expect(403);
    });

    it('should allow Lead Investigator to assign Prosecutor to SECRET case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/cases/${createdCaseId}/members`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          userId: prosecutorUserId,
          caseRole: CaseMemberRole.PROSECUTOR,
        })
        .expect(201);

      expect(res.body.members).toHaveLength(2);
      expect(
        res.body.members.some(
          (m: { userId: string; caseRole: string }) =>
            m.userId === prosecutorUserId && m.caseRole === CaseMemberRole.PROSECUTOR,
        ),
      ).toBe(true);
    });

    it('should now allow assigned Prosecutor to fetch SECRET case details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${prosecutorToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdCaseId);
    });
  });

  describe('Case Lifecycle Status Transitions & Immutability', () => {
    it('should allow Lead Investigator to transition OPEN -> UNDER_REVIEW', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          status: CaseStatus.UNDER_REVIEW,
          reason: 'Initial evidentiary collection complete',
        })
        .expect(200);

      expect(res.body.status).toBe(CaseStatus.UNDER_REVIEW);
    });

    it('should allow assigned Prosecutor to transition UNDER_REVIEW -> CLOSED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${prosecutorToken}`)
        .send({
          status: CaseStatus.CLOSED,
          reason: 'Trial completed and verdict delivered',
        })
        .expect(200);

      expect(res.body.status).toBe(CaseStatus.CLOSED);
    });

    it('should allow Admin to transition CLOSED -> ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: CaseStatus.ARCHIVED,
          reason: 'Permanent vault archiving under BSA 2023 retention rules',
        })
        .expect(200);

      expect(res.body.status).toBe(CaseStatus.ARCHIVED);
    });

    it('should prevent modifying metadata of an ARCHIVED case', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ title: 'Tamper Attempt on Archived Case' })
        .expect(403);
    });
  });

  describe('Case Activity Timeline from Audit Ledger', () => {
    it('should retrieve chronological case activity timeline', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/timeline`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const actions = res.body.map((item: { action: string }) => item.action);
      expect(actions).toContain('CASE_CREATED');
      expect(actions).toContain('CASE_UPDATED');
      expect(actions).toContain('CASE_STATUS_CHANGED');
    });
  });
});
