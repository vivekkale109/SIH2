import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const REQUIRE_REAUTH_KEY = 'requireReAuth';
export const DEFAULT_REAUTH_MAX_AGE_SECONDS = 300; // 5 minutes

export const RequireReAuth = (
  maxAgeSeconds: number = DEFAULT_REAUTH_MAX_AGE_SECONDS,
): CustomDecorator<string> => SetMetadata(REQUIRE_REAUTH_KEY, maxAgeSeconds);
