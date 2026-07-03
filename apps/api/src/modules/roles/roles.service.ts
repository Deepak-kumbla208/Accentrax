import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  list() {
    return this.repo.list();
  }

  async getOrThrow(id: string) {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(name: string) {
    const existing = await this.repo.findByName(name);
    if (existing) throw new ConflictException('A role with this name already exists');
    return this.repo.create({ name });
  }

  async update(id: string, name?: string) {
    const role = await this.getOrThrow(id);
    if (role.isSystem && name) {
      throw new BadRequestException('System roles cannot be renamed');
    }
    return this.repo.update(id, { name });
  }

  async remove(id: string) {
    const role = await this.getOrThrow(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    await this.repo.softDelete(id);
  }

  setPermissions(id: string, permissionKeys: string[]) {
    return this.repo.setPermissions(id, permissionKeys);
  }
}
