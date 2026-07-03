import type { Permission } from '@accentrax/types';
import { useAuthStore } from '@/store/auth';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const has = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    return user.permissions.includes(permission);
  };

  const hasAny = (permissions: Permission[]): boolean => permissions.some(has);

  return { permissions: user?.permissions ?? [], roles: user?.roles ?? [], has, hasAny };
}
