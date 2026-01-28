import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../rbac/role.entity';
import { Permission } from '../rbac/permission.entity';
import { RolePermission } from '../rbac/role-permission.entity';
import { User } from '../users/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, User])],
  providers: [SeedService],
})
export class SeedModule {}
