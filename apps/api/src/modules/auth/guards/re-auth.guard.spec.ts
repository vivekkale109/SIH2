import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ReAuthGuard } from './re-auth.guard';

describe('ReAuthGuard', () => {
  let guard: ReAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ReAuthGuard(reflector);
  });

  const createMockContext = (user?: { authTime?: number }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if route does not require re-auth', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user authenticated within max age (e.g. 100s ago < 300s)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(300);

    const currentEpoch = Math.floor(Date.now() / 1000);
    const context = createMockContext({ authTime: currentEpoch - 100 });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user authentication is older than max age (e.g. 500s ago > 300s)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(300);

    const currentEpoch = Math.floor(Date.now() / 1000);
    const context = createMockContext({ authTime: currentEpoch - 500 });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
