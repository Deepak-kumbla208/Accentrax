import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Permission } from '@accentrax/types';
import type { ApiListResponse } from '@accentrax/types';
import { RequirePermissions } from '../../common/auth/require-permissions.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CompanyAccessDto } from './dto/company-access.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResourceGrantDto } from './dto/resource-grant.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/** Administers user accounts, role assignments, and visibility grants. */
@Controller('users')
@RequirePermissions(Permission.SETTINGS_MANAGE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('q') q?: string,
  ): Promise<ApiListResponse<unknown>> {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const { items, total } = await this.users.list({ page: pageNum, limit: limitNum, q });
    return {
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const user = await this.users.getOrThrow(id);
    return { data: this.users.toAuthProfile(user) };
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.users.create(dto);
    return { data: this.users.toAuthProfile(user) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.users.update(id, dto);
    return { data: this.users.toAuthProfile(user) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.users.remove(id);
    return { data: { success: true } };
  }

  @Post(':id/roles')
  async assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    const user = await this.users.assignRole(id, dto.roleId);
    return { data: this.users.toAuthProfile(user) };
  }

  @Delete(':id/roles/:roleId')
  async removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    const user = await this.users.removeRole(id, roleId);
    return { data: this.users.toAuthProfile(user) };
  }

  @Post(':id/company-access')
  async grantCompanyAccess(@Param('id') id: string, @Body() dto: CompanyAccessDto) {
    const grant = await this.users.grantCompanyAccess(id, dto.companyId);
    return { data: grant };
  }

  @Delete(':id/company-access/:companyId')
  async revokeCompanyAccess(@Param('id') id: string, @Param('companyId') companyId: string) {
    await this.users.revokeCompanyAccess(id, companyId);
    return { data: { success: true } };
  }

  @Post(':id/grants')
  async grantResourceAccess(@Param('id') id: string, @Body() dto: ResourceGrantDto) {
    const grant = await this.users.grantResourceAccess(
      id,
      dto.resourceType,
      dto.resourceId,
      dto.permission,
    );
    return { data: grant };
  }

  @Delete(':id/grants/:grantId')
  async revokeResourceGrant(@Param('id') _id: string, @Param('grantId') grantId: string) {
    await this.users.revokeResourceGrant(grantId);
    return { data: { success: true } };
  }
}
