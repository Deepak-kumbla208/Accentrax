import type { Permission } from '@accentrax/types';

/** Claims embedded in the short-lived access token. */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  name: string;
  roles: string[];
  permissions: Permission[];
}
