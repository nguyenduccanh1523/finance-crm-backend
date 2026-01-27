import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RoleScope } from '../../../common/enums/role-scope.enum';
import { Organization } from '../organizations/organization.entity';
import { RolePermission } from './role-permission.entity';
import { Membership } from './membership.entity';

@Entity({ name: 'roles' })
@Index(['scope', 'orgId', 'name'], { unique: true })
export class Role extends BaseEntity {
  @Column({ name: 'scope', type: 'text' })
  scope: RoleScope; // GLOBAL | ORG

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId?: string | null;

  @ManyToOne(() => Organization, (org) => org.roles, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  organization?: Organization | null;

  @Column({ name: 'name', type: 'text' })
  name: string; // vd: SUPER_ADMIN, ORG_ADMIN, MANAGER, STAFF

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => Membership, (m) => m.role)
  memberships: Membership[];
}
