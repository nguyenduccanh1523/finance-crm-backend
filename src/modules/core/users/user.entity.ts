import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Membership } from '../rbac/membership.entity';
import { Organization } from '../organizations/organization.entity';
import { AuditLog } from '../rbac/audit-log.entity';
import { RefreshToken } from '../auth/refresh-token.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'email', type: 'text', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'status', type: 'smallint', default: 1 })
  status: number; // 1 active, 0 disabled

  @Column({
    name: 'timezone',
    type: 'text',
    default: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @Column({
    name: 'default_currency',
    type: 'char',
    length: 3,
    default: 'VND',
  })
  defaultCurrency: string;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];

  @OneToMany(() => Organization, (org) => org.createdBy)
  organizationsCreated: Organization[];

  @OneToMany(() => AuditLog, (log) => log.actorUser)
  auditLogs: AuditLog[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}
