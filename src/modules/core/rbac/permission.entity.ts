import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity({ name: 'permissions' })
export class Permission extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'code', type: 'text', unique: true })
  code: string; // invoice:read, invoice:write, ...

  @Column({ name: 'module', type: 'text' })
  module: string; // invoice, task, crm, ...

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];
}
