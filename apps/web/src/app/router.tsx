import { Permission } from '@accentrax/types';
import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { RolesPage } from '@/pages/admin/RolesPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { AppLayout } from './AppLayout';
import { PermissionRoute } from './PermissionRoute';
import { PublicOnly, RequireAuth } from './RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'invoices', element: <PlaceholderPage title="Invoices" phase="Phase 3" /> },
      { path: 'expenses', element: <PlaceholderPage title="Expenses" phase="Phase 4" /> },
      { path: 'masters', element: <PlaceholderPage title="Masters" phase="Phase 2" /> },
      {
        path: 'settings/users',
        element: (
          <PermissionRoute permission={Permission.SETTINGS_MANAGE}>
            <UsersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'settings/roles',
        element: (
          <PermissionRoute permission={Permission.SETTINGS_MANAGE}>
            <RolesPage />
          </PermissionRoute>
        ),
      },
      { path: '*', element: <PlaceholderPage title="Not Found" phase="a valid route" /> },
    ],
  },
]);
