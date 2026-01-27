import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Membership } from './membership.entity';

@Entity({ name: 'audit_logs' })
@Index(['orgId', 'createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string | null;

  @Column({ name: 'action', type: 'text' })
  action: string; // CREATE_USER, UPDATE_ORG,...

  @Column({ name: 'entity', type: 'text' })
  entity: string; // users, organizations,...

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ name: 'ip', type: 'text', nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata: Record<string, any>;

  @ManyToOne(() => User, (u) => u.auditLogs, { nullable: true })
  actorUser?: User | null;

  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization | null;

  @ManyToOne(() => Membership, (m) => m.auditLogs, { nullable: true })
  actorMembership?: Membership | null;
}
