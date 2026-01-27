import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { User } from '../users/user.entity';
import { Membership } from '../rbac/membership.entity';
import { Role } from '../rbac/role.entity';

@Entity({ name: 'organizations' })
export class Organization extends SoftDeleteEntity {
  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'tax_code', type: 'text', nullable: true })
  taxCode?: string;

  @Index({ unique: true, where: '"domain" IS NOT NULL' })
  @Column({ name: 'domain', type: 'text', nullable: true })
  domain?: string | null;

  @Column({
    name: 'timezone',
    type: 'text',
    default: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @Column({
    name: 'currency',
    type: 'char',
    length: 3,
    default: 'VND',
  })
  currency: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, (user) => user.organizationsCreated, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  createdBy: User;

  @OneToMany(() => Membership, (m) => m.organization)
  memberships: Membership[];

  @OneToMany(() => Role, (r) => r.organization)
  roles: Role[];
}
