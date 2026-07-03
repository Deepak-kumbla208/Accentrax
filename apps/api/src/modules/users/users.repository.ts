import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Include shape used whenever we need a user's roles + flattened permissions. */
export const userWithAccessInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email }, include: userWithAccessInclude });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({ where: { id }, include: userWithAccessInclude });
  }

  list(params: { page: number; limit: number; q?: string }) {
    const where = params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: 'insensitive' as const } },
            { name: { contains: params.q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userWithAccessInclude,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  create(data: { email: string; name: string; passwordHash: string }) {
    return this.prisma.user.create({ data, include: userWithAccessInclude });
  }

  update(id: string, data: Partial<{ name: string; isActive: boolean; passwordHash: string }>) {
    return this.prisma.user.update({ where: { id }, data, include: userWithAccessInclude });
  }

  softDelete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  touchLastLogin(id: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
  }

  removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }

  grantCompanyAccess(userId: string, companyId: string) {
    return this.prisma.userCompanyAccess.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId },
      update: {},
    });
  }

  revokeCompanyAccess(userId: string, companyId: string) {
    return this.prisma.userCompanyAccess.delete({
      where: { userId_companyId: { userId, companyId } },
    });
  }

  grantResourceAccess(userId: string, resourceType: string, resourceId: string, permission: string) {
    return this.prisma.resourceGrant.upsert({
      where: {
        userId_resourceType_resourceId_permission: { userId, resourceType, resourceId, permission },
      },
      create: { userId, resourceType, resourceId, permission },
      update: {},
    });
  }

  revokeResourceGrant(id: string) {
    return this.prisma.resourceGrant.delete({ where: { id } });
  }
}
