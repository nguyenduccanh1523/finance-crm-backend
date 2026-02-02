import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { Account } from './account.entity';
import { Category } from './category.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

@Entity({ name: 'transactions' })
@Index(['workspaceId', 'occurredAt'])
export class Transaction extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account)
  account: Account;

  @Column({ type: 'text' })
  type: TransactionType;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Index()
  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true })
  category?: Category;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  counterparty?: string;

  @Column({ name: 'transfer_account_id', type: 'uuid', nullable: true })
  transferAccountId?: string;
}
