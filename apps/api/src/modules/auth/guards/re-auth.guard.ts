import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_REAUTH_KEY,
  DEFAULT_REAUTH_MAX_AGE_SECONDS,
} from '../decorators/require-reauth.decorator';
import { AuthenticatedUser } from '../interfaces/auth.interface';

@Injectable()
export class ReAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const maxAgeSeconds = this.reflector.getAllAndOverride<number | undefined>(REQUIRE_REAUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (maxAgeSeconds === undefined) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest() as { user?: AuthenticatedUser };
    if (!user || !user.authTime) {
      throw new ForbiddenException('Re-authentication required: session state invalid');
    }

    const currentEpochSeconds = Math.floor(Date.now() / 1000);
    const ageSeconds = currentEpochSeconds - user.authTime;
    const limit = maxAgeSeconds || DEFAULT_REAUTH_MAX_AGE_SECONDS;

    if (ageSeconds > limit) {
      throw new ForbiddenException(
        `Re-authentication required for this sensitive action. Last authenticated ${ageSeconds}s ago (limit: ${limit}s)`,
      );
    }

    return true;
  }
}
