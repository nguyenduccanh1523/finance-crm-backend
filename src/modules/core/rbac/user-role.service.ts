import { Injectable } from '@nestjs/common';
import { UserRoleRepository } from './repositories/user-role.repository';

/**
 * UserRoleService - Business logic cho user roles
 * Được sử dụng bởi AuthService để lấy roles khi tạo JWT
 */
@Injectable()
export class UserRoleService {
  constructor(private readonly userRoleRepo: UserRoleRepository) {}

  /**
   * Lấy tất cả global roles của user
   * Được gọi khi user login để encode vào JWT
   */
  async getUserGlobalRoles(userId: string): Promise<string[]> {
    return this.userRoleRepo.findRolesByUser(userId);
  }

  /**
   * Gán global role cho user
   */
  async assignGlobalRole(userId: string, roleId: string) {
    return this.userRoleRepo.create(userId, roleId);
  }

  /**
   * Xóa global role của user
   */
  async removeGlobalRole(userId: string, roleId: string) {
    return this.userRoleRepo.delete(userId, roleId);
  }

  /**
   * Check user có global role không
   */
  async hasGlobalRole(userId: string, roleId: string): Promise<boolean> {
    return this.userRoleRepo.existsUserRole(userId, roleId);
  }

  /**
   * Lấy tất cả users có 1 global role
   */
  async getUsersByGlobalRole(roleId: string): Promise<string[]> {
    return this.userRoleRepo.findUsersByRole(roleId);
  }
}
