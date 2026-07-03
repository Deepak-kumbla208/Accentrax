import { Controller, Get } from '@nestjs/common';
import { Permission } from '@accentrax/types';
import { RequirePermissions } from '../../common/auth/require-permissions.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Read-only view of the seeded permission catalog, for role-editor UIs. */
@Controller('permissions')
@RequirePermissions(Permission.SETTINGS_MANAGE)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const permissions = await this.prisma.permission.findMany({ orderBy: { group: 'asc' } });
    return { data: permissions };
  }
}
