import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Permission } from '@accentrax/types';
import type { Prisma } from '@prisma/client';
import { PasswordService } from '../../common/auth/password.service';
import type { RequestUser } from '../../common/auth/request-user';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { userWithAccessInclude, UsersRepository } from './users.repository';

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userWithAccessInclude }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly passwords: PasswordService,
  ) {}

  /** Flattens a user's role assignments into a deduplicated permission set. */
  toAuthProfile(user: UserWithAccess): RequestUser & { isActive: boolean } {
    const roles = new Set<string>();
    const permissions = new Set<Permission>();
    for (const ur of user.userRoles) {
      roles.add(ur.role.name);
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.key as Permission);
      }
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: [...roles],
      permissions: [...permissions],
      isActive: user.isActive,
    };
  }

  async findByEmail(email: string): Promise<UserWithAccess | null> {
    return this.repo.findByEmail(email);
  }

  async getOrThrow(id: string): Promise<UserWithAccess> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async list(params: { page: number; limit: number; q?: string }) {
    const [items, total] = await this.repo.list(params);
    return { items: items.map((u) => this.toAuthProfile(u)), total };
  }

  async create(dto: CreateUserDto): Promise<UserWithAccess> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.repo.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    for (const roleId of dto.roleIds ?? []) {
      await this.repo.assignRole(user.id, roleId);
    }

    return this.getOrThrow(user.id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithAccess> {
    await this.getOrThrow(id);
    const passwordHash = dto.password ? await this.passwords.hash(dto.password) : undefined;
    await this.repo.update(id, { name: dto.name, isActive: dto.isActive, passwordHash });
    return this.getOrThrow(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.repo.softDelete(id);
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.repo.touchLastLogin(id);
  }

  async assignRole(userId: string, roleId: string): Promise<UserWithAccess> {
    await this.getOrThrow(userId);
    await this.repo.assignRole(userId, roleId);
    return this.getOrThrow(userId);
  }

  async removeRole(userId: string, roleId: string): Promise<UserWithAccess> {
    await this.getOrThrow(userId);
    await this.repo.removeRole(userId, roleId);
    return this.getOrThrow(userId);
  }

  grantCompanyAccess(userId: string, companyId: string) {
    return this.repo.grantCompanyAccess(userId, companyId);
  }

  revokeCompanyAccess(userId: string, companyId: string) {
    return this.repo.revokeCompanyAccess(userId, companyId);
  }

  grantResourceAccess(userId: string, resourceType: string, resourceId: string, permission: string) {
    return this.repo.grantResourceAccess(userId, resourceType, resourceId, permission);
  }

  revokeResourceGrant(id: string) {
    return this.repo.revokeResourceGrant(id);
  }
}
