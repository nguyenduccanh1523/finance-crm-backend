import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { User } from '../users/user.entity';
import type { Role } from './role.entity';

/**
 * UserRole: Liên kết User với Global Roles (SUPER_ADMIN, ADMIN, etc.)
 * Scope: GLOBAL only
 * Ví dụ: User1 -> SUPER_ADMIN (global)
 */
@Entity({ name: 'user_roles' })
@Index(['userId', 'roleId'], { unique: true })
export class UserRole extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;

  @ManyToOne('User', 'roles', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne('Role', 'userRoles', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
