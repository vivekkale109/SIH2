process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Authentication & RBAC (e2e)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in successfully with valid admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@sdms.gov.in',
          password: 'Secure#Demo2026!',
        })
        .expect(200);

      expect(res.body.mfaRequired).toBe(false);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();

      adminAccessToken = res.body.tokens.accessToken;
    });

    it('should log in successfully with valid investigator credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'investigator@police.gov.in',
          password: 'Secure#Demo2026!',
        })
        .expect(200);

      expect(res.body.mfaRequired).toBe(false);
      expect(res.body.user.role).toBe('INVESTIGATOR');
      investigatorAccessToken = res.body.tokens.accessToken;
    });

    it('should reject invalid credentials with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@sdms.gov.in',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should lock out account after 5 consecutive failed attempts', async () => {
      const testEmail = 'auditor@vigilance.gov.in';

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword!',
          })
          .expect(401);
      }

      // 5th failed attempt triggers lockout
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        })
        .expect(401);

      // 6th attempt even with correct password is locked out
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Secure#Demo2026!',
        })
        .expect(401);

      expect(res.body.message).toMatch(/temporarily locked/i);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return current user profile when valid token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.email).toBe('admin@sdms.gov.in');
      expect(res.body.role).toBe('ADMIN');
    });
  });

  describe('RBAC Guards (GET /api/v1/users)', () => {
    it('should allow ADMIN to list users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should deny INVESTIGATOR from listing users with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${investigatorAccessToken}`)
        .expect(403);
    });
  });

  describe('MFA Setup Flow', () => {
    it('should generate MFA secret and QR data url for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/generate')
        .set('Authorization', `Bearer ${investigatorAccessToken}`)
        .expect(200);

      expect(res.body.secret).toBeDefined();
      expect(res.body.otpauthUrl).toBeDefined();
      expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
