import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShareGrantDetailSummary, ShareScope, AuditAction, UserRole } from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyService } from '../cases/policy/policy.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateShareDto } from './dto/create-share.dto';
import { QuerySharesDto } from './dto/query-shares.dto';

const REAUTH_WINDOW_SECONDS = 900; // 15 minutes

@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly policyService: PolicyService,
  ) {}

  /**
   * Creates a new time-limited, scoped share grant with cryptographic audit logging.
   * Enforces re-authentication (either recent auth token or password re-confirmation).
   */
  async createShare(
    dto: CreateShareDto,
    user: AuthenticatedUser,
  ): Promise<ShareGrantDetailSummary> {
    // 1. Validate destination
    if (!dto.granteeId && !dto.granteeDepartmentId) {
      throw new BadRequestException(
        'A share grant must specify either a grantee user ID or a grantee department ID',
      );
    }

    if (dto.granteeId && dto.granteeId === user.id) {
      throw new BadRequestException('You cannot create a share grant to yourself');
    }

    // 2. Validate expiration
    const expiresAtDate = new Date(dto.expiresAt);
    if (isNaN(expiresAtDate.getTime()) || expiresAtDate.getTime() <= Date.now()) {
      throw new BadRequestException('Share grant expiration timestamp must be in the future');
    }

    // 3. Re-authentication enforcement
    await this.verifyReAuthentication(user, dto.passwordConfirm);

    // 4. Verify clearance to share the resource
    const canShare = await this.policyService.canShareResource(
      user,
      dto.resourceType,
      dto.resourceId,
    );
    if (!canShare) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not cleared to share ${dto.resourceType} '${dto.resourceId}'`,
      );
    }

    // 5. Verify grantee existence
    if (dto.granteeId) {
      const granteeUser = await this.prisma.user.findUnique({
        where: { id: dto.granteeId },
      });
      if (!granteeUser || !granteeUser.isActive) {
        throw new NotFoundException(`Grantee user '${dto.granteeId}' not found or inactive`);
      }
    }

    if (dto.granteeDepartmentId) {
      const granteeDept = await this.prisma.department.findUnique({
        where: { id: dto.granteeDepartmentId },
      });
      if (!granteeDept) {
        throw new NotFoundException(`Grantee department '${dto.granteeDepartmentId}' not found`);
      }
    }

    // 6. Fetch resource title/details for audit metadata
    let resourceTitle = 'Unknown Resource';
    let resourceCaseNumber: string | undefined;

    if (dto.resourceType === 'CASE') {
      const c = await this.prisma.case.findUnique({ where: { id: dto.resourceId } });
      if (c) {
        resourceTitle = c.title;
        resourceCaseNumber = c.caseNumber;
      }
    } else {
      const d = await this.prisma.document.findUnique({
        where: { id: dto.resourceId },
        include: { case: true },
      });
      if (d) {
        resourceTitle = d.title;
        resourceCaseNumber = d.case.caseNumber;
      }
    }

    // 7. Create share grant in database
    const share = await this.prisma.shareGrant.create({
      data: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        granterId: user.id,
        granteeId: dto.granteeId || null,
        granteeDepartmentId: dto.granteeDepartmentId || null,
        scope: dto.scope,
        expiresAt: expiresAtDate,
      },
      include: {
        granter: true,
        grantee: true,
      },
    });

    // 8. Record SHARE_CREATED in immutable audit ledger
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.SHARE_CREATED,
        entityType: 'ShareGrant',
        entityId: share.id,
        metadata: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          resourceTitle,
          resourceCaseNumber,
          granteeId: dto.granteeId,
          granteeDepartmentId: dto.granteeDepartmentId,
          scope: dto.scope,
          expiresAt: expiresAtDate.toISOString(),
        },
      })
      .catch((err) => this.logger.error('Failed to log SHARE_CREATED audit entry', err));

    this.logger.log(
      `Share grant ${share.id} created by ${user.email} for ${dto.resourceType}:${dto.resourceId} (scope: ${dto.scope}, expires: ${dto.expiresAt})`,
    );

    return this.mapToDetailSummary(share, resourceTitle, resourceCaseNumber);
  }

  /**
   * Retrieves share grants filtered by direction, resource, and active status.
   */
  async getShares(
    query: QuerySharesDto,
    user: AuthenticatedUser,
  ): Promise<ShareGrantDetailSummary[]> {
    const where: Prisma.ShareGrantWhereInput = {};

    // Direction filtering
    if (user.role === UserRole.ADMIN && query.direction === 'all') {
      // Admin can view all system shares
    } else if (query.direction === 'sent') {
      where.granterId = user.id;
    } else if (query.direction === 'received') {
      where.OR = [{ granteeId: user.id }, { granteeDepartmentId: user.departmentId }];
    } else {
      // Default: both sent and received by current user / department
      where.OR = [
        { granterId: user.id },
        { granteeId: user.id },
        { granteeDepartmentId: user.departmentId },
      ];
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.activeOnly) {
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    }

    const shares = await this.prisma.shareGrant.findMany({
      where,
      include: {
        granter: true,
        grantee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate resource titles
    return Promise.all(
      shares.map(async (s) => {
        let title = 'Resource';
        let caseNumber: string | undefined;

        if (s.resourceType === 'CASE') {
          const c = await this.prisma.case.findUnique({
            where: { id: s.resourceId },
            select: { title: true, caseNumber: true },
          });
          if (c) {
            title = c.title;
            caseNumber = c.caseNumber;
          }
        } else if (s.resourceType === 'DOCUMENT') {
          const d = await this.prisma.document.findUnique({
            where: { id: s.resourceId },
            select: { title: true, case: { select: { caseNumber: true } } },
          });
          if (d) {
            title = d.title;
            caseNumber = d.case.caseNumber;
          }
        }

        return this.mapToDetailSummary(s, title, caseNumber);
      }),
    );
  }

  /**
   * Retrieves single share grant by ID.
   */
  async getShareById(shareId: string, user: AuthenticatedUser): Promise<ShareGrantDetailSummary> {
    const share = await this.prisma.shareGrant.findUnique({
      where: { id: shareId },
      include: {
        granter: true,
        grantee: true,
      },
    });

    if (!share) {
      throw new NotFoundException(`Share grant with ID '${shareId}' not found`);
    }

    const isAuthorized =
      user.role === UserRole.ADMIN ||
      share.granterId === user.id ||
      share.granteeId === user.id ||
      share.granteeDepartmentId === user.departmentId;

    if (!isAuthorized) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to inspect share grant '${shareId}'`,
      );
    }

    let title = 'Resource';
    let caseNumber: string | undefined;
    if (share.resourceType === 'CASE') {
      const c = await this.prisma.case.findUnique({
        where: { id: share.resourceId },
        select: { title: true, caseNumber: true },
      });
      if (c) {
        title = c.title;
        caseNumber = c.caseNumber;
      }
    } else {
      const d = await this.prisma.document.findUnique({
        where: { id: share.resourceId },
        select: { title: true, case: { select: { caseNumber: true } } },
      });
      if (d) {
        title = d.title;
        caseNumber = d.case.caseNumber;
      }
    }

    return this.mapToDetailSummary(share, title, caseNumber);
  }

  /**
   * Revokes an active share grant immediately, cutting off further access and logging SHARE_REVOKED.
   */
  async revokeShare(
    shareId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const share = await this.prisma.shareGrant.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundException(`Share grant with ID '${shareId}' not found`);
    }

    // Only granter, admin, or case lead can revoke
    const canRevoke =
      user.role === UserRole.ADMIN ||
      share.granterId === user.id ||
      (await this.policyService.canShareResource(
        user,
        share.resourceType as 'CASE' | 'DOCUMENT',
        share.resourceId,
      ));

    if (!canRevoke) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not permitted to revoke share grant '${shareId}'`,
      );
    }

    if (share.revokedAt) {
      return { success: true, message: 'Share grant was already revoked' };
    }

    const revokedAt = new Date();
    await this.prisma.shareGrant.update({
      where: { id: shareId },
      data: { revokedAt },
    });

    // Record SHARE_REVOKED in ledger
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.SHARE_REVOKED,
        entityType: 'ShareGrant',
        entityId: shareId,
        metadata: {
          resourceType: share.resourceType,
          resourceId: share.resourceId,
          revokedAt: revokedAt.toISOString(),
          revokedBy: user.email,
        },
      })
      .catch((err) => this.logger.error('Failed to log SHARE_REVOKED audit record', err));

    this.logger.log(`Share grant ${shareId} revoked by ${user.email}`);

    return { success: true, message: 'Share grant successfully revoked' };
  }

  /**
   * Accesses a shared resource. Enforces real-time expiry and revocation checks,
   * logs SHARE_ACCESSED in the immutable ledger, and returns resource context.
   */
  async accessSharedResource(
    shareId: string,
    user: AuthenticatedUser,
  ): Promise<{
    share: ShareGrantDetailSummary;
    resource: Record<string, unknown>;
  }> {
    const share = await this.prisma.shareGrant.findUnique({
      where: { id: shareId },
      include: {
        granter: true,
        grantee: true,
      },
    });

    if (!share) {
      throw new NotFoundException(`Share grant with ID '${shareId}' not found`);
    }

    // 1. Revocation check (immediate 403)
    if (share.revokedAt) {
      throw new ForbiddenException(
        `Access Denied: This share grant was revoked on ${share.revokedAt.toISOString()}`,
      );
    }

    // 2. Expiration check (immediate 403)
    if (share.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException(
        `Access Denied: This share grant expired on ${share.expiresAt.toISOString()}`,
      );
    }

    // 3. Grantee identity clearance
    const isRecipient =
      user.role === UserRole.ADMIN ||
      share.granterId === user.id ||
      share.granteeId === user.id ||
      share.granteeDepartmentId === user.departmentId;

    if (!isRecipient) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not the authorized recipient of this share grant`,
      );
    }

    // 4. Fetch the target resource
    let resourceData: Record<string, unknown> = {};
    let resourceTitle = 'Resource';
    let resourceCaseNumber: string | undefined;

    if (share.resourceType === 'CASE') {
      const c = await this.prisma.case.findUnique({
        where: { id: share.resourceId },
        include: {
          department: true,
          documents: { select: { id: true, title: true, type: true, status: true } },
        },
      });
      if (!c) {
        throw new NotFoundException(`Shared case '${share.resourceId}' no longer exists`);
      }
      resourceTitle = c.title;
      resourceCaseNumber = c.caseNumber;
      resourceData = c as unknown as Record<string, unknown>;
    } else {
      const d = await this.prisma.document.findUnique({
        where: { id: share.resourceId },
        include: { case: true, versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
      });
      if (!d) {
        throw new NotFoundException(`Shared document '${share.resourceId}' no longer exists`);
      }
      resourceTitle = d.title;
      resourceCaseNumber = d.case.caseNumber;
      resourceData = {
        id: d.id,
        caseId: d.caseId,
        title: d.title,
        type: d.type,
        classification: d.classification,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        latestVersionNo: d.versions[0]?.versionNo,
      };
    }

    // 5. Record SHARE_ACCESSED audit ledger entry
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.SHARE_ACCESSED,
        entityType: 'ShareGrant',
        entityId: share.id,
        metadata: {
          resourceType: share.resourceType,
          resourceId: share.resourceId,
          resourceTitle,
          scope: share.scope,
          accessedBy: user.email,
        },
      })
      .catch((err) => this.logger.error('Failed to log SHARE_ACCESSED audit entry', err));

    return {
      share: this.mapToDetailSummary(share, resourceTitle, resourceCaseNumber),
      resource: resourceData,
    };
  }

  /**
   * Internal helper validating re-authentication requirement.
   */
  private async verifyReAuthentication(
    user: AuthenticatedUser,
    passwordConfirm?: string,
  ): Promise<void> {
    if (passwordConfirm) {
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!userRecord) {
        throw new NotFoundException('User record not found');
      }

      const valid = await PasswordUtil.verify(userRecord.passwordHash, passwordConfirm);
      if (!valid) {
        throw new ForbiddenException(
          'Re-authentication failed: Password verification did not match',
        );
      }
      return;
    }

    // Fall back to JWT authTime check
    if (user.authTime) {
      const ageSeconds = Math.floor(Date.now() / 1000) - user.authTime;
      if (ageSeconds <= REAUTH_WINDOW_SECONDS) {
        return;
      }
    }

    throw new ForbiddenException(
      'Re-authentication required: Please confirm your password or re-login to proceed with sharing',
    );
  }

  private mapToDetailSummary(
    share: Prisma.ShareGrantGetPayload<{
      include: {
        granter: true;
        grantee: true;
      };
    }>,
    resourceTitle?: string,
    resourceCaseNumber?: string,
  ): ShareGrantDetailSummary {
    const isExpired = share.expiresAt.getTime() <= Date.now();
    const isRevoked = share.revokedAt !== null;

    return {
      id: share.id,
      resourceType: share.resourceType as 'CASE' | 'DOCUMENT',
      resourceId: share.resourceId,
      granterId: share.granterId,
      granteeId: share.granteeId || undefined,
      granteeDepartmentId: share.granteeDepartmentId || undefined,
      scope: share.scope as unknown as ShareScope,
      expiresAt: share.expiresAt.toISOString(),
      revokedAt: share.revokedAt ? share.revokedAt.toISOString() : undefined,
      createdAt: share.createdAt.toISOString(),
      granter: {
        id: share.granter.id,
        email: share.granter.email,
        fullName: share.granter.fullName,
        badgeNumber: share.granter.badgeNumber || undefined,
        role: share.granter.role as unknown as UserRole,
        departmentId: share.granter.departmentId,
        isActive: share.granter.isActive,
        mfaEnabled: share.granter.mfaEnabled,
        createdAt: share.granter.createdAt.toISOString(),
        updatedAt: share.granter.updatedAt.toISOString(),
      },
      grantee: share.grantee
        ? {
            id: share.grantee.id,
            email: share.grantee.email,
            fullName: share.grantee.fullName,
            badgeNumber: share.grantee.badgeNumber || undefined,
            role: share.grantee.role as unknown as UserRole,
            departmentId: share.grantee.departmentId,
            isActive: share.grantee.isActive,
            mfaEnabled: share.grantee.mfaEnabled,
            createdAt: share.grantee.createdAt.toISOString(),
            updatedAt: share.grantee.updatedAt.toISOString(),
          }
        : undefined,
      resourceTitle,
      resourceCaseNumber,
      isExpired,
      isRevoked,
    };
  }
}
