import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { Role } from './role.entity';
import { AuditLog } from './audit-log.entity';

@Entity({ name: 'memberships' })
@Index(['orgId', 'userId'], { unique: true })
export class Membership extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string | null;

  @Column({ name: 'status', type: 'smallint', default: 1 })
  status: number; // 1 active

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt?: Date;

  @ManyToOne(() => Organization, (org) => org.memberships, {
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.memberships, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Role, (role) => role.memberships, {
    nullable: true,
  })
  role?: Role | null;

  @OneToMany(() => AuditLog, (log) => log.actorMembership)
  auditLogs: AuditLog[];
}
