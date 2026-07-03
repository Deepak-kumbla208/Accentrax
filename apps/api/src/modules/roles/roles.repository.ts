import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const withPermissions = {
  rolePermissions: { include: { permission: true } },
} as const;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({ include: withPermissions, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.role.findFirst({ where: { id }, include: withPermissions });
  }

  findByName(name: string) {
    return this.prisma.role.findFirst({ where: { name }, include: withPermissions });
  }

  create(data: { name: string; isSystem?: boolean }) {
    return this.prisma.role.create({ data, include: withPermissions });
  }

  update(id: string, data: { name?: string }) {
    return this.prisma.role.update({ where: { id }, data, include: withPermissions });
  }

  softDelete(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionKeys: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);
    return this.findById(roleId);
  }
}
