import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../user-role.entity';

/**
 * UserRoleRepository - Handle user-global-role associations
 */
@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectRepository(UserRole)
    private readonly typeormRepo: Repository<UserRole>,
  ) {}

  async create(userId: string, roleId: string): Promise<UserRole> {
    const userRole = this.typeormRepo.create({ userId, roleId });
    return this.typeormRepo.save(userRole);
  }

  async findByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRole | null> {
    return this.typeormRepo.findOne({
      where: { userId, roleId },
    });
  }

  async findByUser(userId: string): Promise<UserRole[]> {
    return this.typeormRepo.find({
      where: { userId },
      relations: ['role'],
    });
  }

  async findRolesByUser(userId: string): Promise<string[]> {
    const userRoles = await this.findByUser(userId);
    return userRoles
      .filter((ur) => ur.role != null) // Filter out null roles
      .map((ur) => ur.role.name);
  }

  async findByRole(roleId: string): Promise<UserRole[]> {
    return this.typeormRepo.find({
      where: { roleId },
      relations: ['user'],
    });
  }

  async findUsersByRole(roleId: string): Promise<string[]> {
    const userRoles = await this.findByRole(roleId);
    return userRoles.map((ur) => ur.userId);
  }

  async delete(userId: string, roleId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ userId, roleId });
    return !!result.affected;
  }

  async deleteByUser(userId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ userId });
    return !!result.affected;
  }

  async deleteByRole(roleId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ roleId });
    return !!result.affected;
  }

  async existsUserRole(userId: string, roleId: string): Promise<boolean> {
    const count = await this.typeormRepo.count({
      where: { userId, roleId },
    });
    return count > 0;
  }

  async countUsersByRole(roleId: string): Promise<number> {
    return this.typeormRepo.count({ where: { roleId } });
  }
}
