import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { AppLayout } from './AppLayout';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'invoices', element: <PlaceholderPage title="Invoices" phase="Phase 3" /> },
      { path: 'expenses', element: <PlaceholderPage title="Expenses" phase="Phase 4" /> },
      { path: 'masters', element: <PlaceholderPage title="Masters" phase="Phase 2" /> },
      { path: 'settings', element: <PlaceholderPage title="Settings" phase="Phase 1+" /> },
      { path: '*', element: <PlaceholderPage title="Not Found" phase="a valid route" /> },
    ],
  },
]);
