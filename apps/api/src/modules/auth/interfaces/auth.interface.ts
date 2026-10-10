import { UserRole, UserSummary } from '@sdms/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  departmentId: string;
  authTime: number; // UNIX epoch timestamp (seconds)
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  departmentId: string;
  authTime: number;
  badgeNumber?: string;
}

export type LoginResponse =
  | {
      mfaRequired: false;
      user: UserSummary;
      tokens: AuthTokens;
    }
  | {
      mfaRequired: true;
      userId: string;
      message: string;
    };

export interface MfaGenerateResponse {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}
