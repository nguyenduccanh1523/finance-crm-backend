import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../rbac/role.entity';
import { Permission } from '../rbac/permission.entity';
import { RolePermission } from '../rbac/role-permission.entity';
import { RoleScope } from '../../../common/enums/role-scope.enum';

/**
 * SeedService - Initialize roles and permissions at application startup
 * Note: Global role assignments are done via API, not seeding
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRolesAndPermissions();
    // Note: SEED_ADMIN_USER removed. Manually assign global roles via API.
    // Use: POST /rbac/global-roles/assign { userId, roleId }
  }

  private async seedRolesAndPermissions() {
    const roleData = [
      {
        scope: RoleScope.GLOBAL,
        name: 'SUPER_ADMIN',
        description: 'Toàn quyền hệ thống',
      },
      {
        scope: RoleScope.GLOBAL,
        name: 'SUPPORT',
        description: 'Hỗ trợ hệ thống',
      },
      {
        scope: RoleScope.GLOBAL,
        name: 'TESTER',
        description: 'Tester – dùng để test chức năng',
      },
      {
        scope: RoleScope.ORG,
        name: 'ORG_ADMIN',
        description: 'Quản trị doanh nghiệp',
      },
      {
        scope: RoleScope.ORG,
        name: 'ORG_MEMBER',
        description: 'Nhân viên doanh nghiệp',
      },
    ];

    for (const r of roleData) {
      let role = await this.roleRepo.findOne({
        where: { scope: r.scope, name: r.name },
      });
      if (!role) {
        role = this.roleRepo.create({
          scope: r.scope,
          orgId: null,
          name: r.name,
          description: r.description,
        });
        await this.roleRepo.save(role);
      }
    }

    const permData = [
      {
        code: 'admin:all',
        module: 'admin',
        description: 'Full quyền hệ thống',
      },
      {
        code: 'org:admin',
        module: 'org',
        description: 'Quản lý doanh nghiệp',
      },
      {
        code: 'personal:read',
        module: 'personal',
        description: 'Xem dữ liệu cá nhân',
      },
      {
        code: 'personal:write',
        module: 'personal',
        description: 'Sửa dữ liệu cá nhân',
      },
      { code: 'crm:read', module: 'crm', description: 'Xem CRM' },
      { code: 'crm:write', module: 'crm', description: 'Sửa CRM' },
      {
        code: 'billing:manage',
        module: 'billing',
        description: 'Quản lý billing',
      },
    ];

    for (const p of permData) {
      let perm = await this.permRepo.findOne({ where: { code: p.code } });
      if (!perm) {
        perm = this.permRepo.create(p);
        await this.permRepo.save(perm);
      }
    }

    // Gán tất cả permission cho SUPER_ADMIN
    const superAdminRole = await this.roleRepo.findOne({
      where: { scope: RoleScope.GLOBAL, name: 'SUPER_ADMIN' },
    });

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found. Please seed roles first.');
    }
    const allPerms = await this.permRepo.find();

    for (const perm of allPerms) {
      const exists = await this.rpRepo.findOne({
        where: { roleId: superAdminRole.id, permissionId: perm.id },
      });
      if (!exists) {
        const rp = this.rpRepo.create({
          roleId: superAdminRole.id,
          permissionId: perm.id,
        });
        await this.rpRepo.save(rp);
      }
    }
  }

  // REMOVED: seedSuperAdminUser() - Use API to assign global roles instead
  // API: POST /rbac/global-roles/assign { userId, roleId }
  // This is cleaner and doesn't couple seeding to .env secrets
}
