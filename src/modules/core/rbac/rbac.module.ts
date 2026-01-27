import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { Membership } from './membership.entity';
import { AuditLog } from './audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      Membership,
      AuditLog,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RbacModule {}
