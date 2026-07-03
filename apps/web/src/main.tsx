import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppBootstrap } from '@/app/AppBootstrap';
import { router } from '@/app/router';
import { queryClient } from '@/lib/queryClient';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppBootstrap>
        <RouterProvider router={router} />
      </AppBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
