import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@accentrax/types';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

/** Phase 0 dashboard: proves the web → API wiring via the health endpoint. */
export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<HealthResponse>('/health')).data,
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Foundation scaffold — Phase 0. Role-scoped widgets arrive in Phase 5.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">API Status</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {isLoading ? (
              <span className="text-lg font-semibold text-muted-foreground">Checking…</span>
            ) : isError ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-lg font-semibold text-red-500">Unreachable</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-lg font-semibold capitalize">{data?.status}</span>
              </>
            )}
          </div>
          {data && (
            <p className="mt-2 text-xs text-muted-foreground">
              Uptime {Math.round(data.uptime)}s
            </p>
          )}
        </div>

        {['Invoices', 'Expenses'].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <div className="mt-3 text-2xl font-semibold">—</div>
            <p className="mt-2 text-xs text-muted-foreground">Available from later phases</p>
          </div>
        ))}
      </div>
    </div>
  );
}
