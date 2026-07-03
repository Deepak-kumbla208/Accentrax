import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { FullPageLoader } from '@/components/FullPageLoader';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/**
 * Runs once on app load. The access token lives only in memory, so a page
 * reload loses it — this silently calls /auth/refresh (which relies on the
 * httpOnly cookie) to re-hydrate the session before any route renders.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    let cancelled = false;

    api
      .post('/auth/refresh')
      .then((res) => {
        if (cancelled) return;
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setSession(user, accessToken);
      })
      .catch(() => {
        // No valid session cookie — user starts logged out.
      })
      .finally(() => {
        if (!cancelled) useAuthStore.getState().finishBootstrap();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isBootstrapping) return <FullPageLoader />;
  return <>{children}</>;
}
