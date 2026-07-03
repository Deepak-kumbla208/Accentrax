import type { Permission } from '@accentrax/types';

/** Shape attached to `req.user` after JwtAuthGuard runs. */
export interface RequestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: Permission[];
}
