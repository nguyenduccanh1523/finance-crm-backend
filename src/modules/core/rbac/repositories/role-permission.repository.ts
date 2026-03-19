import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../role-permission.entity';
import { In } from 'typeorm';

/**
 * RolePermissionRepository - Handle role-permission associations
 */
@Injectable()
export class RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermission)
    private readonly typeormRepo: Repository<RolePermission>,
  ) {}

  async create(roleId: string, permissionId: string): Promise<RolePermission> {
    const rp = this.typeormRepo.create({ roleId, permissionId });
    return this.typeormRepo.save(rp);
  }

  async findByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.typeormRepo.findOne({
      where: { roleId, permissionId },
    });
  }

  async findPermissionsByRole(roleId: string): Promise<RolePermission[]> {
    return this.typeormRepo.find({
      where: { roleId },
      relations: ['permission'],
    });
  }

  async findPermissionsByRoles(roleIds: string[]): Promise<RolePermission[]> {
    if (!roleIds.length) return [];
    return this.typeormRepo.find({
      where: { roleId: In(roleIds) },
      relations: ['permission'],
    });
  }

  async findRolesByPermission(permissionId: string): Promise<RolePermission[]> {
    return this.typeormRepo.find({
      where: { permissionId },
      relations: ['role'],
    });
  }

  async delete(roleId: string, permissionId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({
      roleId,
      permissionId,
    });
    return !!result.affected;
  }

  async deleteByRole(roleId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ roleId });
    return !!result.affected;
  }

  async deleteByPermission(permissionId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ permissionId });
    return !!result.affected;
  }

  async existsAssociation(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const count = await this.typeormRepo.count({
      where: { roleId, permissionId },
    });
    return count > 0;
  }
}
