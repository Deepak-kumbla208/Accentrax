import type { Permission } from '@accentrax/types';
import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

/** Renders children only if the current user holds the given permission. UI-only — the backend is the real gate. */
export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { has } = usePermissions();
  return has(permission) ? <>{children}</> : null;
}
