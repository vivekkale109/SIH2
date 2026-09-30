import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { UserRole, UserSummary, PaginatedResult, AuditAction } from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  public async create(dto: CreateUserDto, actorId: string = 'system'): Promise<UserSummary> {
    const policyResult = PasswordUtil.validatePolicy(dto.password);
    if (!policyResult.valid) {
      throw new BadRequestException(
        `Password does not meet security policy: ${policyResult.errors.join(', ')}`,
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check if email already registered
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException(`User with email '${normalizedEmail}' already exists`);
    }

    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID '${dto.departmentId}' not found`);
    }

    const passwordHash = await PasswordUtil.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName.trim(),
        badgeNumber: dto.badgeNumber?.trim() || null,
        role: dto.role,
        departmentId: dto.departmentId,
        isActive: true,
      },
    });

    void this.auditService
      .record({
        actorId,
        action: AuditAction.USER_CREATED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record', err));

    void this.auditService
      .record({
        actorId,
        action: AuditAction.ROLE_ASSIGNED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          role: user.role,
          targetUserId: user.id,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record', err));

    this.logger.log(`Created user ${user.email} with role ${user.role}`);
    return this.toSummary(user);
  }

  public async findAll(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    departmentId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<PaginatedResult<UserSummary>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }
    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { badgeNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: users.map((u) => this.toSummary(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findById(id: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return this.toSummary(user);
  }

  public async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string = 'system',
  ): Promise<UserSummary> {
    await this.findById(id);

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException(`Department with ID '${dto.departmentId}' not found`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
        ...(dto.badgeNumber !== undefined && { badgeNumber: dto.badgeNumber.trim() || null }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    void this.auditService
      .record({
        actorId,
        action: AuditAction.USER_UPDATED,
        entityType: 'User',
        entityId: updated.id,
        metadata: {
          changedFields: Object.keys(dto),
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record', err));

    if (dto.role) {
      void this.auditService
        .record({
          actorId,
          action: AuditAction.ROLE_ASSIGNED,
          entityType: 'User',
          entityId: updated.id,
          metadata: {
            role: dto.role,
            targetUserId: updated.id,
          },
        })
        .catch((err) => this.logger.error('Failed to write audit record', err));
    }

    return this.toSummary(updated);
  }

  public async disable(id: string, actorId: string = 'system'): Promise<UserSummary> {
    await this.findById(id);

    // Disable user and revoke all refresh tokens in a transaction
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    void this.auditService
      .record({
        actorId,
        action: AuditAction.USER_DISABLED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          targetUserId: user.id,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record', err));

    this.logger.warn(`User ${user.email} disabled and all active sessions revoked`);
    return this.toSummary(user);
  }

  public toSummary(user: User): UserSummary {
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
}
