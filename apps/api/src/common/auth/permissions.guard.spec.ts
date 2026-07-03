import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, SystemRole } from '@accentrax/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionsGuard } from './permissions.guard';
import type { RequestUser } from './request-user';

function makeContext(user: RequestUser | undefined, required: Permission[] | undefined) {
  const reflector = new Reflector();
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;

  const getAllAndOverride = () => required;
  reflector.getAllAndOverride = getAllAndOverride as typeof reflector.getAllAndOverride;

  return { context, reflector };
}

describe('PermissionsGuard', () => {
  let baseUser: RequestUser;

  beforeEach(() => {
    baseUser = {
      id: 'u1',
      email: 'user@test.local',
      name: 'Test User',
      roles: [SystemRole.USER],
      permissions: [Permission.EXPENSE_CREATE],
    };
  });

  it('allows routes with no @RequirePermissions metadata', () => {
    const { context, reflector } = makeContext(baseUser, undefined);
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });

  it('denies (returns false) when there is no authenticated user', () => {
    const { context, reflector } = makeContext(undefined, [Permission.EXPENSE_CREATE]);
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(false);
  });

  it('allows when the user holds one of the required permissions', () => {
    const { context, reflector } = makeContext(baseUser, [Permission.EXPENSE_CREATE]);
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when the user lacks the required permission', () => {
    const { context, reflector } = makeContext(baseUser, [Permission.SETTINGS_MANAGE]);
    expect(() => new PermissionsGuard(reflector).canActivate(context)).toThrow(
      /Missing required permission/,
    );
  });

  it('always allows Super Admin, regardless of their explicit permission list', () => {
    const superAdmin: RequestUser = { ...baseUser, roles: [SystemRole.SUPER_ADMIN], permissions: [] };
    const { context, reflector } = makeContext(superAdmin, [Permission.SETTINGS_MANAGE]);
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });

  it('passes when ANY of several required permissions matches', () => {
    const { context, reflector } = makeContext(baseUser, [
      Permission.SETTINGS_MANAGE,
      Permission.EXPENSE_CREATE,
    ]);
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });
});
