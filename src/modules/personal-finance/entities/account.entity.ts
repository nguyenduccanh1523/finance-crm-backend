import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { AccountType } from '../../../common/enums/account-type.enum';

@Entity({ name: 'accounts' })
export class Account extends SoftDeleteEntity {
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  type: AccountType;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ name: 'opening_balance_cents', type: 'bigint', default: 0 })
  openingBalanceCents: number;

  @Column({ name: 'current_balance_cents', type: 'bigint', default: 0 })
  currentBalanceCents: number;
}
