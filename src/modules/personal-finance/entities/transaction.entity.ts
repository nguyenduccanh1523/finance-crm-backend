import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import type { PersonalWorkspace } from './personal-workspace.entity';
import type { Account } from './account.entity';
import type { Category } from './category.entity';
import type { TransactionType } from '../../../common/enums/transaction-type.enum';
import type { TransactionTag } from './transaction-tag.entity';

@Entity({ name: 'transactions' })
@Index(['workspaceId', 'occurredAt'])
export class Transaction extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @JoinColumn({ name: 'workspace_id' })
  @ManyToOne('PersonalWorkspace', { onDelete: 'CASCADE' })
  workspace!: PersonalWorkspace;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne('Account')
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToMany('TransactionTag', 'transaction')
  transactionTags!: TransactionTag[];

  @Column({ type: 'text' })
  type!: TransactionType;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Index()
  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne('Category', { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  counterparty?: string;

  @Column({ name: 'transfer_account_id', type: 'uuid', nullable: true })
  transferAccountId?: string;
}
