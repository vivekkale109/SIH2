import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@sdms/shared-types';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordUtil } from '../../common/utils/password.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'officer@police.gov.in',
    passwordHash: '',
    fullName: 'Officer Vikram',
    badgeNumber: 'POL-100',
    role: UserRole.INVESTIGATOR,
    departmentId: 'dept-123',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await PasswordUtil.hash('Secure#Officer2026!');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findUnique: jest.fn(),
              create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
              update: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, def?: unknown) => {
              if (key === 'JWT_SECRET') return 'test-secret-at-least-32-characters-long';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

      const user = await service.validateUser('officer@police.gov.in', 'Secure#Officer2026!');
      expect(user).toBeDefined();
      expect(user.id).toBe('user-123');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

      await expect(
        service.validateUser('officer@police.gov.in', 'WrongPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock out account after 5 consecutive failed attempts', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

      for (let i = 0; i < 5; i++) {
        await expect(
          service.validateUser('officer@police.gov.in', 'WrongPass123!'),
        ).rejects.toThrow(UnauthorizedException);
      }

      // 6th attempt should be blocked by lockout
      await expect(service.validateUser('officer@police.gov.in', 'WrongPass123!')).rejects.toThrow(
        /temporarily locked/,
      );
    });
  });

  describe('login', () => {
    it('should return tokens directly when MFA is disabled', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

      const res = await service.login({
        email: 'officer@police.gov.in',
        password: 'Secure#Officer2026!',
      });

      expect(res.mfaRequired).toBe(false);
      if (!res.mfaRequired) {
        expect(res.tokens.accessToken).toBe('mocked-jwt-token');
        expect(res.user.email).toBe(mockUser.email);
      }
    });

    it('should require MFA code when MFA is enabled and no code provided', async () => {
      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP' };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mfaUser as never);

      const res = await service.login({
        email: 'officer@police.gov.in',
        password: 'Secure#Officer2026!',
      });

      expect(res.mfaRequired).toBe(true);
      if (res.mfaRequired) {
        expect(res.userId).toBe(mockUser.id);
      }
    });

    it('should succeed when MFA is enabled and valid code is provided', async () => {
      const secret = authenticator.generateSecret();
      const code = authenticator.generate(secret);
      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: secret };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mfaUser as never);

      const res = await service.login({
        email: 'officer@police.gov.in',
        password: 'Secure#Officer2026!',
        mfaCode: code,
      });

      expect(res.mfaRequired).toBe(false);
      if (!res.mfaRequired) {
        expect(res.tokens.accessToken).toBe('mocked-jwt-token');
      }
    });
  });
});
