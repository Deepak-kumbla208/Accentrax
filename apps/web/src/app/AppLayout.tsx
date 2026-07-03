import { Permission } from '@accentrax/types';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/** App shell: permission-filtered sidebar + topbar. Backend re-enforces every route regardless. */
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: null },
  { to: '/invoices', label: 'Invoices', icon: FileText, end: false, permission: null },
  { to: '/expenses', label: 'Expenses', icon: Receipt, end: false, permission: null },
  { to: '/masters', label: 'Masters', icon: Users, end: false, permission: null },
  {
    to: '/settings/users',
    label: 'Users',
    icon: Users,
    end: false,
    permission: Permission.SETTINGS_MANAGE,
  },
  {
    to: '/settings/roles',
    label: 'Roles',
    icon: ShieldCheck,
    end: false,
    permission: Permission.SETTINGS_MANAGE,
  },
] as const;

export function AppLayout() {
  const { has } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => !item.permission || has(item.permission));

  const initials = user?.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            A
          </div>
          <span className="font-semibold">Accentrax</span>
        </div>
        <nav className="space-y-1 p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search…"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium"
              title={user?.name}
            >
              {initials ?? <Settings className="h-4 w-4" />}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
