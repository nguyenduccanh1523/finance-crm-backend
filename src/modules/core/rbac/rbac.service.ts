import { Inject, Injectable } from '@nestjs/common';
import * as cacheManager from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';

import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { UserRoleRepository } from './repositories/user-role.repository';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { RoleScope } from '../../../common/enums/role-scope.enum';

/**
 * RbacService - Business logic layer
 * Không trực tiếp gọi database, mà thông qua repositories
 * Nguyên tắc: Dependency Injection + Separation of Concerns
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permRepo: PermissionRepository,
    private readonly rpRepo: RolePermissionRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly userRoleRepo: UserRoleRepository,
    @Inject(CACHE_MANAGER) private readonly cache: cacheManager.Cache,
  ) {}

  // ============ ROLE CRUD ============
  async createRole(dto: CreateRoleDto) {
    return this.roleRepo.create(dto);
  }

  async listRoles() {
    return this.roleRepo.findAll();
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    return this.roleRepo.update(id, dto);
  }

  async deleteRole(id: string) {
    return this.roleRepo.delete(id);
  }

  // ============ PERMISSION CRUD ============
  async createPermission(dto: CreatePermissionDto) {
    // Validate: permission code phải unique
    const existing = await this.permRepo.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException(
        `Permission code '${dto.code}' already exists`,
      );
    }
    return this.permRepo.create(dto);
  }

  async listPermissions() {
    return this.permRepo.findAll();
  }

  // ============ ROLE_PERMISSION ============
  async assignRolePermission(dto: AssignRolePermissionDto) {
    // Validate role exists and is accessible
    await this.roleRepo.findByIdOrThrow(dto.roleId);

    // Validate permission exists
    await this.permRepo.findByIdOrThrow(dto.permissionId);

    // Check if association already exists
    const exists = await this.rpRepo.findByRoleAndPermission(
      dto.roleId,
      dto.permissionId,
    );
    if (exists) {
      throw new BadRequestException('Permission already assigned to this role');
    }

    // Create association
    const result = await this.rpRepo.create(dto.roleId, dto.permissionId);

    // Clear cache cho tất cả users có role này
    await this.clearCacheForRole(dto.roleId);

    return result;
  }

  async removeRolePermission(dto: AssignRolePermissionDto) {
    const deleted = await this.rpRepo.delete(dto.roleId, dto.permissionId);

    if (deleted) {
      await this.clearCacheForRole(dto.roleId);
    }

    if (!deleted) {
      throw new BadRequestException('Role permission not found');
    }

    return { success: true };
  }

  // ============ MEMBERSHIP (Organization Roles) ============
  async assignMembership(dto: AssignMembershipDto) {
    // Validate orgId is provided
    if (!dto.orgId) {
      throw new BadRequestException('orgId is required');
    }

    // Validate user & role exist
    await this.roleRepo.findByIdOrThrow(dto.roleId);

    // Check if membership already exists
    const exists = await this.membershipRepo.findByUserAndOrg(
      dto.userId,
      dto.orgId,
    );
    if (exists) {
      throw new BadRequestException(
        'User is already member of this organization',
      );
    }

    // Create membership
    const result = await this.membershipRepo.create(dto);

    // Clear cache cho user
    await this.clearCacheForUser(dto.userId);

    return result;
  }

  async listMembershipsByUser(userId: string) {
    return this.membershipRepo.findByUser(userId);
  }

  async listMembershipsByOrg(orgId: string) {
    return this.membershipRepo.findByOrg(orgId);
  }

  // ============ GLOBAL ROLES (UserRole) ============
  async assignGlobalRole(userId: string, roleId: string) {
    // Validate role is GLOBAL scope
    const role = await this.roleRepo.findByIdOrThrow(roleId);
    if (role.scope !== RoleScope.GLOBAL) {
      throw new BadRequestException(
        'Only GLOBAL scope roles can be assigned as global roles',
      );
    }

    // Check if already assigned
    const exists = await this.userRoleRepo.findByUserAndRole(userId, roleId);
    if (exists) {
      throw new BadRequestException('User already has this global role');
    }

    // Create user role
    const result = await this.userRoleRepo.create(userId, roleId);

    // Clear JWT cache
    await this.cache.del(`jwt:roles:${userId}`);

    return result;
  }

  async removeGlobalRole(userId: string, roleId: string) {
    const deleted = await this.userRoleRepo.delete(userId, roleId);

    if (deleted) {
      await this.cache.del(`jwt:roles:${userId}`);
    }

    if (!deleted) {
      throw new BadRequestException('User global role not found');
    }

    return { success: true };
  }

  async getUserGlobalRoles(userId: string): Promise<string[]> {
    return this.userRoleRepo.findRolesByUser(userId);
  }

  async listUsersByGlobalRole(roleId: string) {
    return this.userRoleRepo.findByRole(roleId);
  }

  // ============ HELPER METHODS (Private) ============
  private async clearCacheForUser(userId: string): Promise<void> {
    await this.cache.del(`perm:global:user:${userId}`);
    await this.cache.del(`jwt:roles:${userId}`);
  }

  private async clearCacheForRole(roleId: string): Promise<void> {
    // Find all users with this role (via Membership)
    const userIds = await this.membershipRepo.findUsersByRole(roleId);
    for (const userId of userIds) {
      await this.clearCacheForUser(userId);
    }
  }
}
