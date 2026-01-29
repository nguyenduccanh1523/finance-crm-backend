import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../rbac/role.entity';
import { Permission } from '../rbac/permission.entity';
import { RolePermission } from '../rbac/role-permission.entity';
import { User } from '../users/user.entity';
import { RoleScope } from '../../../common/enums/role-scope.enum';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRolesAndPermissions();
    await this.seedSuperAdminUser();
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

  private async seedSuperAdminUser() {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        '[Seed] SEED_ADMIN_EMAIL hoặc SEED_ADMIN_PASSWORD chưa cấu hình – bỏ qua seed admin',
      );
      return;
    }

    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = this.userRepo.create({
        email,
        passwordHash: hash,
        fullName: 'Super Admin',
        status: 1,
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
      });
      await this.userRepo.save(user);
      console.log('[Seed] Tạo user SUPER_ADMIN:', email);
    } else {
      console.log('[Seed] User SUPER_ADMIN đã tồn tại:', email);
    }

    // Bạn có thể lưu mapping user ↔ role global ở chỗ khác
    // Vì role global ở đây là conceptual, chúng ta sẽ encode vào JWT khi login
  }
}
