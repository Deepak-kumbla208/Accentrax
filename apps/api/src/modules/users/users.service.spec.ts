import { Permission, SystemRole } from '@accentrax/types';
import { describe, expect, it } from 'vitest';
import { PasswordService } from '../../common/auth/password.service';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';

function makeUser(overrides: Partial<Parameters<UsersService['toAuthProfile']>[0]> = {}) {
  return {
    id: 'u1',
    email: 'a@b.com',
    name: 'A B',
    isActive: true,
    passwordHash: 'hash',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userRoles: [
      {
        userId: 'u1',
        roleId: 'r1',
        role: {
          id: 'r1',
          name: SystemRole.OFFICE_ADMIN,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          rolePermissions: [
            {
              roleId: 'r1',
              permissionId: 'p1',
              permission: {
                id: 'p1',
                key: Permission.EXPENSE_APPROVE,
                label: 'Approve Expense',
                group: 'Expenses',
              },
            },
            {
              roleId: 'r1',
              permissionId: 'p2',
              permission: {
                id: 'p2',
                key: Permission.EXPENSE_APPROVE, // duplicate key across roles is common; dedup expected
                label: 'Approve Expense',
                group: 'Expenses',
              },
            },
          ],
        },
      },
    ],
    ...overrides,
  } as Parameters<UsersService['toAuthProfile']>[0];
}

describe('UsersService.toAuthProfile', () => {
  const service = new UsersService({} as UsersRepository, new PasswordService());

  it('flattens roles into a deduplicated permission list', () => {
    const profile = service.toAuthProfile(makeUser());
    expect(profile.roles).toEqual([SystemRole.OFFICE_ADMIN]);
    expect(profile.permissions).toEqual([Permission.EXPENSE_APPROVE]);
  });

  it('carries isActive through for the auth flow to check', () => {
    const profile = service.toAuthProfile(makeUser({ isActive: false }));
    expect(profile.isActive).toBe(false);
  });

  it('returns an empty permission set for a user with no roles', () => {
    const profile = service.toAuthProfile(makeUser({ userRoles: [] }));
    expect(profile.roles).toEqual([]);
    expect(profile.permissions).toEqual([]);
  });
});
