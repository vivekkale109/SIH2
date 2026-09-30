import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, CaseMemberRole, CaseStatus, ClassificationLevel } from '@prisma/client';
import {
  CaseSummary,
  CaseDetailSummary,
  PaginatedResult,
  AuditAction,
  AuditLedgerEntry,
  CaseStatus as SharedCaseStatus,
  ClassificationLevel as SharedClassificationLevel,
  CaseMemberRole as SharedCaseMemberRole,
  DepartmentType,
  UserRole,
} from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyService } from './policy/policy.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { AddCaseMemberDto } from './dto/add-case-member.dto';
import { QueryCaseDto } from './dto/query-case.dto';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly policyService: PolicyService,
  ) {}

  /**
   * Creates a new case and assigns the creator as LEAD_INVESTIGATOR.
   * Records a cryptographically chained audit event.
   */
  async create(dto: CreateCaseDto, creator: AuthenticatedUser): Promise<CaseDetailSummary> {
    const existing = await this.prisma.case.findUnique({
      where: { caseNumber: dto.caseNumber },
    });

    if (existing) {
      throw new ConflictException(`Case with number '${dto.caseNumber}' already exists`);
    }

    const departmentId = dto.departmentId || creator.departmentId;

    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID '${departmentId}' not found`);
    }

    const newCase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          caseNumber: dto.caseNumber,
          title: dto.title,
          description: dto.description,
          classification: dto.classification || ClassificationLevel.RESTRICTED,
          departmentId,
          createdById: creator.id,
          status: CaseStatus.OPEN,
        },
      });

      // Automatically enroll creator as LEAD_INVESTIGATOR
      await tx.caseMember.create({
        data: {
          caseId: created.id,
          userId: creator.id,
          caseRole: CaseMemberRole.LEAD_INVESTIGATOR,
        },
      });

      return created;
    });

    void this.auditService
      .record({
        actorId: creator.id,
        action: AuditAction.CASE_CREATED,
        entityType: 'Case',
        entityId: newCase.id,
        metadata: {
          caseNumber: newCase.caseNumber,
          title: newCase.title,
          classification: newCase.classification,
          departmentId: newCase.departmentId,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record for case creation', err));

    this.logger.log(`Created case ${newCase.caseNumber} by ${creator.email}`);
    return this.findById(newCase.id, creator);
  }

  /**
   * Retrieves paginated cases with database-level ABAC policy enforcement.
   */
  async findAll(
    query: QueryCaseDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<CaseSummary>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const abacWhere = this.policyService.buildAbacWhereClause(user);
    const filterWhere: Prisma.CaseWhereInput = {};

    if (query.status) {
      filterWhere.status = query.status;
    }
    if (query.classification) {
      filterWhere.classification = query.classification;
    }
    if (query.departmentId) {
      filterWhere.departmentId = query.departmentId;
    }
    if (query.search) {
      filterWhere.OR = [
        { caseNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const where: Prisma.CaseWhereInput = {
      AND: [abacWhere, filterWhere],
    };

    const [total, items] = await Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { documents: true },
          },
        },
      }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        description: c.description || undefined,
        status: c.status as unknown as SharedCaseStatus,
        classification: c.classification as unknown as SharedClassificationLevel,
        departmentId: c.departmentId,
        createdById: c.createdById,
        documentCount: c._count.documents,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves a single case by ID with members and metadata, subject to ABAC clearance.
   */
  async findById(id: string, user: AuthenticatedUser): Promise<CaseDetailSummary> {
    const hasAccess = await this.policyService.canAccessCase(user, id);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Access Denied: User '${user.email}' is not authorized to access case '${id}'`,
      );
    }

    const caseItem = await this.prisma.case.findUnique({
      where: { id },
      include: {
        department: true,
        createdBy: true,
        members: {
          include: {
            user: {
              include: { department: true },
            },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${id}' not found`);
    }

    return this.mapToDetailSummary(caseItem);
  }

  /**
   * Updates case details (title, description, classification) under ABAC authorization.
   */
  async update(
    id: string,
    dto: UpdateCaseDto,
    user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    const canModify = await this.policyService.canModifyCase(user, id);
    if (!canModify) {
      throw new ForbiddenException(
        `ABAC Modification Denied: User '${user.email}' cannot edit case '${id}'`,
      );
    }

    const existing = await this.prisma.case.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Case with ID '${id}' not found`);
    }

    if (existing.status === CaseStatus.ARCHIVED) {
      throw new BadRequestException('Archived cases are immutable and cannot be updated');
    }

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.classification ? { classification: dto.classification } : {}),
      },
    });

    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.CASE_UPDATED,
        entityType: 'Case',
        entityId: id,
        metadata: {
          caseNumber: updated.caseNumber,
          changedFields: Object.keys(dto),
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record for case update', err));

    return this.findById(id, user);
  }

  /**
   * Transitions a case through its lifecycle stages (OPEN -> UNDER_REVIEW -> CLOSED -> ARCHIVED).
   */
  async updateStatus(
    id: string,
    dto: UpdateCaseStatusDto,
    user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    const canTransition = await this.policyService.canTransitionStatus(user, id, dto.status);
    if (!canTransition) {
      throw new ForbiddenException(
        `ABAC Transition Denied: User '${user.email}' cannot transition case '${id}' to '${dto.status}'`,
      );
    }

    const existing = await this.prisma.case.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Case with ID '${id}' not found`);
    }

    if (existing.status === dto.status) {
      throw new BadRequestException(`Case is already in '${dto.status}' status`);
    }

    const updated = await this.prisma.case.update({
      where: { id },
      data: { status: dto.status },
    });

    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.CASE_STATUS_CHANGED,
        entityType: 'Case',
        entityId: id,
        metadata: {
          caseNumber: updated.caseNumber,
          previousStatus: existing.status,
          newStatus: dto.status,
          reason: dto.reason || 'Status transition requested',
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record for status change', err));

    this.logger.log(
      `Case ${updated.caseNumber} status transitioned to ${dto.status} by ${user.email}`,
    );
    return this.findById(id, user);
  }

  /**
   * Adds or updates a member's case-level role.
   */
  async addMember(
    id: string,
    dto: AddCaseMemberDto,
    user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    const canManage = await this.policyService.canManageMembers(user, id);
    if (!canManage) {
      throw new ForbiddenException(
        `ABAC Member Management Denied: User '${user.email}' cannot manage members of case '${id}'`,
      );
    }

    const [caseItem, targetUser] = await Promise.all([
      this.prisma.case.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ]);

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${id}' not found`);
    }
    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException(`Active target user '${dto.userId}' not found`);
    }

    await this.prisma.caseMember.upsert({
      where: {
        caseId_userId: {
          caseId: id,
          userId: dto.userId,
        },
      },
      create: {
        caseId: id,
        userId: dto.userId,
        caseRole: dto.caseRole,
      },
      update: {
        caseRole: dto.caseRole,
      },
    });

    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.CASE_MEMBER_ADDED,
        entityType: 'Case',
        entityId: id,
        metadata: {
          caseNumber: caseItem.caseNumber,
          targetUserId: targetUser.id,
          targetEmail: targetUser.email,
          caseRole: dto.caseRole,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record for member add', err));

    return this.findById(id, user);
  }

  /**
   * Removes a member from a case.
   */
  async removeMember(
    id: string,
    targetUserId: string,
    user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    const canManage = await this.policyService.canManageMembers(user, id);
    if (!canManage) {
      throw new ForbiddenException(
        `ABAC Member Management Denied: User '${user.email}' cannot manage members of case '${id}'`,
      );
    }

    const caseItem = await this.prisma.case.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${id}' not found`);
    }

    // Check if member is creator or the sole lead
    const isTargetSoleLead =
      caseItem.members.filter((m) => m.caseRole === CaseMemberRole.LEAD_INVESTIGATOR).length <= 1 &&
      caseItem.members.some(
        (m) => m.userId === targetUserId && m.caseRole === CaseMemberRole.LEAD_INVESTIGATOR,
      );

    if (isTargetSoleLead) {
      throw new BadRequestException('Cannot remove the sole Lead Investigator from the case');
    }

    await this.prisma.caseMember.delete({
      where: {
        caseId_userId: {
          caseId: id,
          userId: targetUserId,
        },
      },
    });

    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.CASE_MEMBER_REMOVED,
        entityType: 'Case',
        entityId: id,
        metadata: {
          caseNumber: caseItem.caseNumber,
          targetUserId,
        },
      })
      .catch((err) => this.logger.error('Failed to write audit record for member remove', err));

    return this.findById(id, user);
  }

  /**
   * Retrieves case activity timeline from immutable audit ledger.
   */
  async getTimeline(id: string, user: AuthenticatedUser): Promise<AuditLedgerEntry[]> {
    await this.findById(id, user); // verifies ABAC access

    const result = await this.auditService.findAll({
      entityType: 'Case',
      entityId: id,
      limit: 100,
      page: 1,
    });

    return result.items.reverse();
  }

  private mapToDetailSummary(
    c: Prisma.CaseGetPayload<{
      include: {
        department: true;
        createdBy: true;
        members: {
          include: {
            user: {
              include: { department: true };
            };
          };
        };
        _count: {
          select: { documents: true };
        };
      };
    }>,
  ): CaseDetailSummary {
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      description: c.description || undefined,
      status: c.status as unknown as SharedCaseStatus,
      classification: c.classification as unknown as SharedClassificationLevel,
      departmentId: c.departmentId,
      createdById: c.createdById,
      documentCount: c._count?.documents || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      department: c.department
        ? {
            id: c.department.id,
            name: c.department.name,
            code: c.department.code,
            type: c.department.type as unknown as DepartmentType,
            jurisdiction: c.department.jurisdiction || undefined,
            createdAt: c.department.createdAt.toISOString(),
            updatedAt: c.department.updatedAt.toISOString(),
          }
        : undefined,
      createdBy: c.createdBy
        ? {
            id: c.createdBy.id,
            email: c.createdBy.email,
            fullName: c.createdBy.fullName,
            badgeNumber: c.createdBy.badgeNumber || undefined,
            role: c.createdBy.role as unknown as UserRole,
            departmentId: c.createdBy.departmentId,
            isActive: c.createdBy.isActive,
            mfaEnabled: c.createdBy.mfaEnabled,
            createdAt: c.createdBy.createdAt.toISOString(),
            updatedAt: c.createdBy.updatedAt.toISOString(),
          }
        : undefined,
      members: (c.members || []).map((m) => ({
        id: m.id,
        caseId: m.caseId,
        userId: m.userId,
        caseRole: m.caseRole as unknown as SharedCaseMemberRole,
        assignedAt: m.assignedAt.toISOString(),
        user: m.user
          ? {
              id: m.user.id,
              email: m.user.email,
              fullName: m.user.fullName,
              badgeNumber: m.user.badgeNumber || undefined,
              role: m.user.role as unknown as UserRole,
              departmentId: m.user.departmentId,
              isActive: m.user.isActive,
              mfaEnabled: m.user.mfaEnabled,
              createdAt: m.user.createdAt.toISOString(),
              updatedAt: m.user.updatedAt.toISOString(),
            }
          : undefined,
      })),
    };
  }
}
