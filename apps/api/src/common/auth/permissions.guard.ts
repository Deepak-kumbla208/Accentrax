import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@accentrax/types';
import { SystemRole } from '@accentrax/types';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { RequestUser } from './request-user';

/**
 * Enforces @RequirePermissions() on routes. Super Admin always passes.
 * Routes without the decorator are allowed through (auth alone is enough) —
 * scope with @RequirePermissions when a route needs a specific capability.
 */
@Injectable()
export class PermissionsGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = req.user;
    if (!user) return false;

    if (user.roles.includes(SystemRole.SUPER_ADMIN)) return true;

    const hasPermission = required.some((p) => user.permissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${required.join(' or ')}`);
    }
    return true;
  }
}
