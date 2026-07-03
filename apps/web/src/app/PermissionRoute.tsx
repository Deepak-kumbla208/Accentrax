import type { Permission } from '@accentrax/types';
import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

/** Blocks a route unless the user holds the given permission. Backend re-checks regardless. */
export function PermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { has } = usePermissions();
  if (!has(permission)) {
    return <PlaceholderPage title="Not authorized" phase="a role with access to this page" />;
  }
  return <>{children}</>;
}
