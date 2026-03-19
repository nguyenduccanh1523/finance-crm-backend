import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { Membership } from './membership.entity';
import { UserRole } from './user-role.entity';
import { AuditLog } from './audit-log.entity';

import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { UserRoleRepository } from './repositories/user-role.repository';

import { RbacService } from './rbac.service';
import { UserRoleService } from './user-role.service';
import { RbacAdminController } from './rbac-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      Membership,
      UserRole,
      AuditLog,
    ]),
  ],
  controllers: [RbacAdminController],
  providers: [
    RbacService,
    UserRoleService,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    MembershipRepository,
    UserRoleRepository,
  ],
  exports: [RbacService, UserRoleService],
})
export class RbacModule {}
