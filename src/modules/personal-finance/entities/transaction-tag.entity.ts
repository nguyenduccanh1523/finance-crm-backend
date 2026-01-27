import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Transaction } from './transaction.entity';
import { Tag } from './tag.entity';

@Entity({ name: 'transaction_tags' })
export class TransactionTag {
  @PrimaryColumn({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  transaction: Transaction;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  tag: Tag;
}
