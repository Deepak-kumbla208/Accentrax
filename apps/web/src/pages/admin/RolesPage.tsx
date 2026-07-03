import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface PermissionRow {
  id: string;
  key: string;
  label: string;
  group: string;
}

interface RoleDetail {
  id: string;
  name: string;
  isSystem: boolean;
  rolePermissions: { permission: PermissionRow }[];
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ data: RoleDetail[] }>('/roles')).data.data,
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get<{ data: PermissionRow[] }>('/permissions')).data.data,
  });

  const selectedRole = rolesQuery.data?.find((r) => r.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (selectedRole) {
      setChecked(new Set(selectedRole.rolePermissions.map((rp) => rp.permission.key)));
    }
  }, [selectedRole]);

  const savePermissions = useMutation({
    mutationFn: (permissionKeys: string[]) =>
      api.put(`/roles/${selectedRoleId}/permissions`, { permissionKeys }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const grouped = (permissionsQuery.data ?? []).reduce<Record<string, PermissionRow[]>>(
    (acc, p) => {
      (acc[p.group] ??= []).push(p);
      return acc;
    },
    {},
  );

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Select a role to view or edit its permissions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="rounded-lg border border-border bg-card p-2">
          {rolesQuery.data?.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm',
                selectedRoleId === r.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              {r.name}
              {r.isSystem && <span className="ml-2 text-xs text-muted-foreground">system</span>}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          {!selectedRole ? (
            <p className="text-sm text-muted-foreground">Select a role from the list.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([group, perms]) => (
                <div key={group}>
                  <h3 className="mb-2 text-sm font-semibold">{group}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {perms.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked.has(p.key)}
                          onChange={() => toggle(p.key)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={() => savePermissions.mutate([...checked])}
                disabled={savePermissions.isPending}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {savePermissions.isPending ? 'Saving…' : 'Save permissions'}
              </button>
              {savePermissions.isSuccess && (
                <span className="ml-3 text-xs text-green-600">Saved.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
