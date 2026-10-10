import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { DashboardStats, UserRole, CaseStatus, ClassificationLevel } from '@sdms/shared-types';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getStats(user: AuthenticatedUser): Promise<DashboardStats> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 1. Audit ledger verify and count
    let auditLedgerTotal = 0;
    let auditChainValid = true;
    try {
      const verification = await this.auditService.verifyChain();
      auditChainValid = verification.valid;
      auditLedgerTotal = verification.totalEntries;
    } catch (err) {
      this.logger.warn(`Failed to verify audit chain for dashboard: ${err}`);
      auditChainValid = false;
      auditLedgerTotal = await this.prisma.auditLedger.count();
    }

    // 2. Cases counts (role-scoped vs global)
    const isGlobalViewer =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.AUDITOR ||
      user.role === UserRole.RECORDS_MANAGER;

    const caseWhere = isGlobalViewer
      ? {}
      : {
          OR: [
            { createdById: user.id },
            { departmentId: user.departmentId },
            { members: { some: { userId: user.id } } },
          ],
        };

    const [totalCases, activeCases, closedCases, archivedCases] = await Promise.all([
      this.prisma.case.count({ where: caseWhere }),
      this.prisma.case.count({
        where: {
          ...caseWhere,
          status: { in: [CaseStatus.OPEN, CaseStatus.UNDER_REVIEW] },
        },
      }),
      this.prisma.case.count({
        where: {
          ...caseWhere,
          status: CaseStatus.CLOSED,
        },
      }),
      this.prisma.case.count({
        where: {
          ...caseWhere,
          status: CaseStatus.ARCHIVED,
        },
      }),
    ]);

    // 3. Documents & Exports counts
    const [
      totalDocuments,
      totalExports,
      quarantinedCount,
      documentsNeedingReview,
      ocrPendingCount,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.exportPackage.count(),
      this.prisma.document.count({ where: { status: 'QUARANTINED' } }),
      this.prisma.document.count({ where: { status: 'NEEDS_REVIEW' } }),
      this.prisma.document.count({ where: { status: 'PROCESSING' } }),
    ]);

    // 4. Shares counts (active vs expiring < 24h)
    const activeShareWhere = {
      revokedAt: null,
      expiresAt: { gt: now },
      ...(isGlobalViewer
        ? {}
        : {
            OR: [
              { granterId: user.id },
              { granteeId: user.id },
              { granteeDepartmentId: user.departmentId },
            ],
          }),
    };

    const [activeSharesCount, expiringSharesCount] = await Promise.all([
      this.prisma.shareGrant.count({
        where: activeShareWhere,
      }),
      this.prisma.shareGrant.count({
        where: {
          ...activeShareWhere,
          expiresAt: { gt: now, lte: in24Hours },
        },
      }),
    ]);

    // 5. Classification distribution
    const [publicDocs, restrictedDocs, confidentialDocs, secretDocs] = await Promise.all([
      this.prisma.document.count({ where: { classification: ClassificationLevel.PUBLIC } }),
      this.prisma.document.count({ where: { classification: ClassificationLevel.RESTRICTED } }),
      this.prisma.document.count({ where: { classification: ClassificationLevel.CONFIDENTIAL } }),
      this.prisma.document.count({ where: { classification: ClassificationLevel.SECRET } }),
    ]);

    // 6. Recent cases
    const recentCasesRaw = await this.prisma.case.findMany({
      where: caseWhere,
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        _count: { select: { documents: true } },
      },
    });

    const recentCases = recentCasesRaw.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      classification: c.classification,
      createdAt: c.createdAt.toISOString(),
      documentCount: c._count.documents,
    }));

    // 7. Expiring shares list (expiring in next 48 hours)
    const expiringSharesRaw = await this.prisma.shareGrant.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now, lte: in48Hours },
        ...(isGlobalViewer
          ? {}
          : {
              OR: [
                { granterId: user.id },
                { granteeId: user.id },
                { granteeDepartmentId: user.departmentId },
              ],
            }),
      },
      include: {
        grantee: { select: { email: true } },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
    });

    // Resolve resource titles for expiring shares
    const expiringShares = await Promise.all(
      expiringSharesRaw.map(async (share) => {
        let caseNumber: string | undefined;
        let caseTitle: string | undefined;
        let documentTitle: string | undefined;

        if (share.resourceType === 'CASE') {
          const c = await this.prisma.case.findUnique({
            where: { id: share.resourceId },
            select: { caseNumber: true, title: true },
          });
          if (c) {
            caseNumber = c.caseNumber;
            caseTitle = c.title;
          }
        } else if (share.resourceType === 'DOCUMENT') {
          const d = await this.prisma.document.findUnique({
            where: { id: share.resourceId },
            select: { title: true, case: { select: { caseNumber: true, title: true } } },
          });
          if (d) {
            documentTitle = d.title;
            caseNumber = d.case.caseNumber;
            caseTitle = d.case.title;
          }
        }

        const msRemaining = share.expiresAt.getTime() - now.getTime();
        const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
        const minutesRemaining = Math.max(
          0,
          Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60)),
        );
        const isUrgent = msRemaining < 24 * 60 * 60 * 1000;

        return {
          id: share.id,
          resourceType: share.resourceType,
          resourceId: share.resourceId,
          caseNumber,
          caseTitle,
          documentTitle,
          scope: share.scope,
          granteeEmail: share.grantee?.email,
          expiresAt: share.expiresAt.toISOString(),
          timeRemainingFormatted: `${hoursRemaining}h ${minutesRemaining}m`,
          isUrgent,
        };
      }),
    );

    // 8. Recent audit entries
    const recentAuditRaw = await this.prisma.auditLedger.findMany({
      orderBy: { sequence: 'desc' },
      take: 8,
    });

    // Fetch actor emails for human-readable audit activity
    const actorIds = [...new Set(recentAuditRaw.map((a) => a.actorId).filter(Boolean))];
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, email: true },
    });
    const actorEmailMap = new Map<string, string>(actors.map((u) => [u.id, u.email]));

    const recentAuditLogs = recentAuditRaw.map((entry) => ({
      id: entry.id,
      sequence: Number(entry.sequence),
      action: entry.action,
      actorEmail: actorEmailMap.get(entry.actorId) || entry.actorId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      timestamp: entry.timestamp.toISOString(),
    }));

    return {
      overview: {
        totalCases,
        activeCases,
        closedCases,
        archivedCases,
        totalDocuments,
        totalExports,
        activeSharesCount,
        expiringSharesCount,
        auditLedgerTotal,
        auditChainValid,
        quarantinedCount,
      },
      classificationCounts: {
        PUBLIC: publicDocs,
        RESTRICTED: restrictedDocs,
        CONFIDENTIAL: confidentialDocs,
        SECRET: secretDocs,
      },
      pendingVerifications: {
        documentsNeedingReview,
        ocrPendingCount,
      },
      recentCases,
      expiringShares,
      recentAuditLogs,
    };
  }
}
