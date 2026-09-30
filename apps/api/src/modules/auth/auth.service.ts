import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { User } from '@prisma/client';
import { UserRole, UserSummary } from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { EnableMfaDto, DisableMfaDto } from './dto/mfa.dto';
import {
  AuthTokens,
  JwtPayload,
  LoginResponse,
  MfaGenerateResponse,
} from './interfaces/auth.interface';

interface FailedLoginTracker {
  attempts: number;
  lockedUntil?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failedLogins = new Map<string, FailedLoginTracker>();
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async validateUser(email: string, pass: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const tracker = this.failedLogins.get(normalizedEmail);

    if (tracker?.lockedUntil && Date.now() < tracker.lockedUntil) {
      const remainingSeconds = Math.ceil((tracker.lockedUntil - Date.now()) / 1000);
      throw new UnauthorizedException(
        `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingSeconds} seconds.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      this.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await PasswordUtil.verify(user.passwordHash, pass);
    if (!isPasswordValid) {
      this.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on success
    this.failedLogins.delete(normalizedEmail);
    return user;
  }

  public async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (user.mfaEnabled) {
      if (!loginDto.mfaCode) {
        return {
          mfaRequired: true,
          userId: user.id,
          message: 'TOTP MFA authentication code required',
        };
      }

      if (!user.mfaSecret) {
        throw new UnauthorizedException('MFA is enabled but configuration is incomplete');
      }

      const isValid = authenticator.check(loginDto.mfaCode, user.mfaSecret);

      if (!isValid) {
        throw new UnauthorizedException('Invalid MFA authentication code');
      }
    }

    const tokens = await this.generateTokens(user);

    return {
      mfaRequired: false,
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user);
  }

  public async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  public async generateMfaSecret(userId: string): Promise<MfaGenerateResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'SDMS-Legal', secret);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  public async enableMfa(userId: string, dto: EnableMfaDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = authenticator.check(dto.code, dto.secret);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code. Failed to enable MFA.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: dto.secret,
      },
    });

    this.logger.log(`MFA enabled successfully for user ${user.email}`);
  }

  public async disableMfa(userId: string, dto: DisableMfaDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await PasswordUtil.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password. Failed to disable MFA.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    this.logger.log(`MFA disabled for user ${user.email}`);
  }

  public async getUserSummaryById(userId: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  public sanitizeUser(user: User): UserSummary {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      badgeNumber: user.badgeNumber || undefined,
      role: user.role as unknown as UserRole,
      departmentId: user.departmentId,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const authTime = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
      departmentId: user.departmentId,
      authTime,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    // 64-hex cryptographically secure random token
    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // 900 seconds
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private recordFailedAttempt(email: string): void {
    const current = this.failedLogins.get(email) || { attempts: 0 };
    current.attempts += 1;

    if (current.attempts >= AuthService.MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + AuthService.LOCKOUT_DURATION_MS;
      this.logger.warn(`Account locked due to 5 failed attempts: ${email}`);
    }

    this.failedLogins.set(email, current);
  }
}
