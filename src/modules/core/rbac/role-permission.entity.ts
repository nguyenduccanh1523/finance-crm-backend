import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Role } from './role.entity';
import type { Permission } from './permission.entity';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;

  @ManyToOne('Role', 'rolePermissions', {
    onDelete: 'CASCADE',
  })
  role!: Role;

  @ManyToOne('Permission', 'rolePermissions', {
    onDelete: 'CASCADE',
  })
  permission!: Permission;
}
