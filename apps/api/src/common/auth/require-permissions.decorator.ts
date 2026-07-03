import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@accentrax/types';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Gates a route behind one or more permission keys (ANY match passes). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
