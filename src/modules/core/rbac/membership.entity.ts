import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { Organization } from '../organizations/organization.entity';
import type { User } from '../users/user.entity';
import type { Role } from './role.entity';
import type { AuditLog } from './audit-log.entity';

@Entity({ name: 'memberships' })
@Index(['orgId', 'userId'], { unique: true })
export class Membership extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string | null;

  @Column({ name: 'status', type: 'smallint', default: 1 })
  status!: number; // 1 active

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt?: Date;

  @ManyToOne('Organization', 'memberships', {
    onDelete: 'CASCADE',
  })
  organization!: Organization;

  @ManyToOne('User', 'memberships', {
    onDelete: 'CASCADE',
  })
  user!: User;

  @ManyToOne('Role', 'memberships', {
    nullable: true,
  })
  role?: Role | null;

  @OneToMany('AuditLog', 'actorMembership')
  auditLogs!: AuditLog[];
}
