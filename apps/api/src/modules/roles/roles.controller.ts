import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Permission } from '@accentrax/types';
import { RequirePermissions } from '../../common/auth/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@RequirePermissions(Permission.SETTINGS_MANAGE)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  async list() {
    return { data: await this.roles.list() };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { data: await this.roles.getOrThrow(id) };
  }

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    return { data: await this.roles.create(dto.name) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return { data: await this.roles.update(id, dto.name) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.roles.remove(id);
    return { data: { success: true } };
  }

  @Put(':id/permissions')
  async setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return { data: await this.roles.setPermissions(id, dto.permissionKeys) };
  }
}
