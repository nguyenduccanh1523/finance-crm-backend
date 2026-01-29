import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as cacheManager from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { Membership } from './membership.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { AssignMembershipDto } from './dto/assign-membership.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @Inject(CACHE_MANAGER) private readonly cache: cacheManager.Cache,
  ) {}

  // ROLE CRUD
  async createRole(dto: CreateRoleDto) {
    const role = this.roleRepo.create(dto);
    return this.roleRepo.save(role);
  }

  async listRoles() {
    return this.roleRepo.find();
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    Object.assign(role, dto);
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string) {
    return this.roleRepo.delete(id);
  }

  // PERMISSION CRUD
  async createPermission(dto: CreatePermissionDto) {
    const perm = this.permRepo.create(dto);
    return this.permRepo.save(perm);
  }

  async listPermissions() {
    return this.permRepo.find();
  }

  // ROLE_PERMISSION
  async assignRolePermission(dto: AssignRolePermissionDto) {
    const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const perm = await this.permRepo.findOne({
      where: { id: dto.permissionId },
    });
    if (!perm) throw new NotFoundException('Permission not found');

    let rp = await this.rpRepo.findOne({
      where: { roleId: dto.roleId, permissionId: dto.permissionId },
    });

    if (!rp) {
      rp = this.rpRepo.create({
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      });
      await this.rpRepo.save(rp);

      // ✅ CLEAR CACHE: tất cả user có role này
      await this.clearRolePermissionCache(dto.roleId);
    }

    return rp;
  }

  private async clearUserPermissionCache(userId: string) {
    await this.cache.del(`perm:global:user:${userId}`);
  }

  private async clearRolePermissionCache(roleId: string) {
    const memberships = await this.membershipRepo.find({
      where: { roleId },
    });

    for (const m of memberships) {
      await this.clearUserPermissionCache(m.userId);
    }
  }

  async removeRolePermission(dto: AssignRolePermissionDto) {
    const result = await this.rpRepo.delete({
      roleId: dto.roleId,
      permissionId: dto.permissionId,
    });

    if (result.affected) {
      // ✅ CLEAR CACHE cho toàn bộ user có role đó
      await this.clearRolePermissionCache(dto.roleId);
    }

    return result;
  }

  // MEMBERSHIP
  async assignMembership(dto: AssignMembershipDto) {
    let membership = await this.membershipRepo.findOne({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });

    if (!membership) {
      membership = this.membershipRepo.create({
        userId: dto.userId,
        roleId: dto.roleId,
      });
      await this.membershipRepo.save(membership);

      // ✅ CLEAR CACHE cho user này
      await this.clearUserPermissionCache(dto.userId);
    }

    return membership;
  }

  async listMembershipsByUser(userId: string) {
    return this.membershipRepo.find({
      where: { userId },
      relations: ['role'],
    });
  }
}
