import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ApiListResponse } from '@accentrax/types';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'At least 8 characters'),
  roleId: z.string().optional(),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<ApiListResponse<AdminUser>>('/users')).data,
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ data: Role[] }>('/roles')).data.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });

  const createUser = useMutation({
    mutationFn: (values: CreateUserForm) =>
      api.post('/users', {
        email: values.email,
        name: values.name,
        password: values.password,
        roleIds: values.roleId ? [values.roleId] : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage accounts and role assignments.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Cancel' : 'New user'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((v) => createUser.mutate(v))}
          className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
        >
          <div>
            <input
              placeholder="Name"
              {...register('name')}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <input
              placeholder="Email"
              type="email"
              {...register('email')}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <input
              placeholder="Password"
              type="password"
              {...register('password')}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>
          <select
            {...register('roleId')}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No role</option>
            {rolesQuery.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Create user
            </button>
            {createUser.isError && (
              <span className="ml-3 text-xs text-red-500">Failed to create user.</span>
            )}
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Roles</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data?.data.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2">{u.roles.join(', ') || '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      u.isActive
                        ? 'rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600'
                        : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usersQuery.isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}
