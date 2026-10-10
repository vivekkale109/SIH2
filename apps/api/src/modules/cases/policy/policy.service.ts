import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, CaseMemberRole, CaseStatus, ClassificationLevel } from '@prisma/client';
import { UserRole } from '@sdms/shared-types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates if a user is authorized under ABAC to view/read a specific case.
   * Rules:
   * 1. ADMIN and AUDITOR have global visibility.
   * 2. The case creator always has access.
   * 3. Assigned members of the case (any case-level role) have access.
   * 4. Active, non-revoked share grants permit access.
   * 5. Users from the same department may access PUBLIC or RESTRICTED cases without direct assignment.
   * 6. CONFIDENTIAL and SECRET cases require direct assignment or ADMIN/AUDITOR roles.
   * 7. Users outside the department without assignment or share grant are strictly denied.
   */
  async canAccessCase(user: AuthenticatedUser, caseId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.AUDITOR) {
      return true;
    }

    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${caseId}' not found`);
    }

    // 2. Creator access
    if (caseItem.createdById === user.id) {
      return true;
    }

    // 3. Case member assignment
    if (caseItem.members.length > 0) {
      return true;
    }

    // 4. Share grant evaluation (user or department level)
    const activeShare = await this.prisma.shareGrant.findFirst({
      where: {
        resourceType: 'CASE',
        resourceId: caseId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ granteeId: user.id }, { granteeDepartmentId: user.departmentId }],
      },
    });

    if (activeShare) {
      return true;
    }

    // 5 & 6. Department and Classification clearance
    if (caseItem.departmentId === user.departmentId) {
      if (
        caseItem.classification === ClassificationLevel.PUBLIC ||
        caseItem.classification === ClassificationLevel.RESTRICTED
      ) {
        return true;
      }
      // CONFIDENTIAL or SECRET requires explicit membership
      return false;
    }

    // 7. Outside department with no membership/share
    return false;
  }

  /**
   * Evaluates if a user can modify case metadata (title, description, classification).
   */
  async canModifyCase(user: AuthenticatedUser, caseId: string): Promise<boolean> {
    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${caseId}' not found`);
    }

    if (caseItem.status === CaseStatus.ARCHIVED) {
      return false;
    }

    if (user.role === UserRole.ADMIN || caseItem.createdById === user.id) {
      return true;
    }

    const member = caseItem.members[0];
    return member?.caseRole === CaseMemberRole.LEAD_INVESTIGATOR;
  }

  /**
   * Evaluates if a user can manage case membership (add/remove members).
   */
  async canManageMembers(user: AuthenticatedUser, caseId: string): Promise<boolean> {
    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${caseId}' not found`);
    }

    if (caseItem.status === CaseStatus.ARCHIVED || caseItem.status === CaseStatus.CLOSED) {
      return false;
    }

    if (user.role === UserRole.ADMIN || caseItem.createdById === user.id) {
      return true;
    }

    const member = caseItem.members[0];
    return member?.caseRole === CaseMemberRole.LEAD_INVESTIGATOR;
  }

  /**
   * Evaluates if a user can transition the lifecycle status of a case.
   */
  async canTransitionStatus(
    user: AuthenticatedUser,
    caseId: string,
    targetStatus: CaseStatus,
  ): Promise<boolean> {
    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${caseId}' not found`);
    }

    if (caseItem.status === targetStatus) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const isCreator = caseItem.createdById === user.id;
    const member = caseItem.members[0];
    const isLead = isCreator || member?.caseRole === CaseMemberRole.LEAD_INVESTIGATOR;

    switch (targetStatus) {
      case CaseStatus.UNDER_REVIEW:
        // Lead investigator, assigned investigator, or creator can submit for review
        return (
          isLead ||
          member?.caseRole === CaseMemberRole.INVESTIGATOR ||
          user.role === UserRole.INVESTIGATOR
        );

      case CaseStatus.CLOSED:
        // Lead investigator, assigned prosecutor, or creator can close case
        return (
          isLead ||
          member?.caseRole === CaseMemberRole.PROSECUTOR ||
          user.role === UserRole.PROSECUTOR
        );

      case CaseStatus.ARCHIVED:
        // Records manager, lead investigator, or admin can archive a closed case
        if (caseItem.status !== CaseStatus.CLOSED && !isLead) {
          return false;
        }
        return isLead || user.role === UserRole.RECORDS_MANAGER;

      case CaseStatus.OPEN:
        // Reopen case: only lead investigator or admin
        return isLead;

      default:
        return false;
    }
  }

  /**
   * Evaluates if a user can access a specific document under ABAC, including direct case clearance,
   * active case-level shares, and active document-level shares.
   */
  async canAccessDocument(
    user: AuthenticatedUser,
    documentId: string,
  ): Promise<{ granted: boolean; scope: 'FULL' | 'DOWNLOAD' | 'VIEW_ONLY'; shareId?: string }> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.AUDITOR) {
      return { granted: true, scope: 'FULL' };
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    // 1. Creator of document or case
    if (doc.createdById === user.id || doc.case.createdById === user.id) {
      return { granted: true, scope: 'FULL' };
    }

    // 2. Direct case membership
    if (doc.case.members.length > 0) {
      return { granted: true, scope: 'FULL' };
    }

    // 3. Department clearance for PUBLIC / RESTRICTED
    if (doc.case.departmentId === user.departmentId) {
      if (
        doc.classification === ClassificationLevel.PUBLIC ||
        doc.classification === ClassificationLevel.RESTRICTED
      ) {
        return { granted: true, scope: 'FULL' };
      }
    }

    const now = new Date();

    // 4. Case-level active share grant
    const caseShares = await this.prisma.shareGrant.findMany({
      where: {
        resourceType: 'CASE',
        resourceId: doc.caseId,
        revokedAt: null,
        expiresAt: { gt: now },
        OR: [{ granteeId: user.id }, { granteeDepartmentId: user.departmentId }],
      },
    });

    if (caseShares.length > 0) {
      const best = caseShares.find((s) => s.scope === 'DOWNLOAD') || caseShares[0];
      return {
        granted: true,
        scope: best.scope as 'DOWNLOAD' | 'VIEW_ONLY',
        shareId: best.id,
      };
    }

    // 5. Document-level active share grant
    const docShares = await this.prisma.shareGrant.findMany({
      where: {
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        revokedAt: null,
        expiresAt: { gt: now },
        OR: [{ granteeId: user.id }, { granteeDepartmentId: user.departmentId }],
      },
    });

    if (docShares.length > 0) {
      const best = docShares.find((s) => s.scope === 'DOWNLOAD') || docShares[0];
      return {
        granted: true,
        scope: best.scope as 'DOWNLOAD' | 'VIEW_ONLY',
        shareId: best.id,
      };
    }

    return { granted: false, scope: 'VIEW_ONLY' };
  }

  /**
   * Evaluates if a user is permitted to create a share grant for a given resource.
   */
  async canShareResource(
    user: AuthenticatedUser,
    resourceType: 'CASE' | 'DOCUMENT',
    resourceId: string,
  ): Promise<boolean> {
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (resourceType === 'CASE') {
      const caseItem = await this.prisma.case.findUnique({
        where: { id: resourceId },
        include: {
          members: {
            where: { userId: user.id },
          },
        },
      });

      if (!caseItem) {
        throw new NotFoundException(`Case with ID '${resourceId}' not found`);
      }

      if (caseItem.createdById === user.id) {
        return true;
      }

      const member = caseItem.members[0];
      return member?.caseRole === CaseMemberRole.LEAD_INVESTIGATOR;
    }

    if (resourceType === 'DOCUMENT') {
      const doc = await this.prisma.document.findUnique({
        where: { id: resourceId },
        include: {
          case: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!doc) {
        throw new NotFoundException(`Document with ID '${resourceId}' not found`);
      }

      if (doc.createdById === user.id || doc.case.createdById === user.id) {
        return true;
      }

      const member = doc.case.members[0];
      return member?.caseRole === CaseMemberRole.LEAD_INVESTIGATOR;
    }

    return false;
  }

  /**
   * Constructs a Prisma WHERE clause enforcing ABAC scoping for case listings and searches.
   */
  buildAbacWhereClause(user: AuthenticatedUser): Prisma.CaseWhereInput {
    if (user.role === UserRole.ADMIN || user.role === UserRole.AUDITOR) {
      return {};
    }

    return {
      OR: [
        { createdById: user.id },
        { members: { some: { userId: user.id } } },
        {
          departmentId: user.departmentId,
          classification: {
            in: [ClassificationLevel.PUBLIC, ClassificationLevel.RESTRICTED],
          },
        },
      ],
    };
  }

  /**
   * Evaluates if a user is authorized under ABAC to create a verifiable signed export package for a case.
   */
  async canExportCase(user: AuthenticatedUser, caseId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const hasAccess = await this.canAccessCase(user, caseId);
    if (!hasAccess) {
      return false;
    }

    // Role-based export permissions (Prosecutor, Investigator, Court Officer, Records Manager)
    if (
      user.role === UserRole.PROSECUTOR ||
      user.role === UserRole.INVESTIGATOR ||
      user.role === UserRole.COURT_OFFICER ||
      user.role === UserRole.RECORDS_MANAGER
    ) {
      return true;
    }

    return false;
  }
}
