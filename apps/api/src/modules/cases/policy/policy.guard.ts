import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyAction, POLICY_ACTION_KEY } from './policy.types';
import { PolicyService } from './policy.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAction = this.reflector.getAllAndOverride<PolicyAction>(POLICY_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredAction) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('User authentication required for policy authorization');
    }

    const caseId = request.params?.id || request.params?.caseId || request.body?.caseId;
    if (!caseId) {
      // If endpoint doesn't specify a case identifier in params, allow through
      return true;
    }

    let allowed = false;

    switch (requiredAction) {
      case PolicyAction.VIEW_CASE:
        allowed = await this.policyService.canAccessCase(user, caseId);
        break;

      case PolicyAction.MODIFY_CASE:
        allowed = await this.policyService.canModifyCase(user, caseId);
        break;

      case PolicyAction.MANAGE_MEMBERS:
        allowed = await this.policyService.canManageMembers(user, caseId);
        break;

      case PolicyAction.TRANSITION_STATUS: {
        const targetStatus = request.body?.status;
        if (!targetStatus) {
          throw new BadRequestException('Target status required for transition');
        }
        allowed = await this.policyService.canTransitionStatus(user, caseId, targetStatus);
        break;
      }

      default:
        allowed = false;
    }

    if (!allowed) {
      throw new ForbiddenException(
        `ABAC Policy violation: user '${user.email}' (${user.role}) is denied '${requiredAction}' on case '${caseId}'`,
      );
    }

    return true;
  }
}
