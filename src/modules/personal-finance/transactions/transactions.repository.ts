import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionTag } from '../entities/transaction-tag.entity';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import { Tag } from '../entities/tag.entity';

@Injectable()
export class TransactionsRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionTag)
    private readonly txTagRepo: Repository<TransactionTag>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  getQueryBuilder(alias = 't') {
    return this.txRepo
      .createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.transactionTags`, 'tt')
      .leftJoinAndSelect('tt.tag', 'tag', 'tag.deleted_at IS NULL')
      .leftJoinAndSelect(`${alias}.category`, 'cat')
      .leftJoinAndSelect(`${alias}.account`, 'acc')
      .leftJoinAndSelect(`${alias}.workspace`, 'ws');
  }

  async findById(id: string, workspaceId: string) {
    return this.getQueryBuilder()
      .where('t.id = :id', { id })
      .andWhere('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL')
      .getOne();
  }

  async countByMonthRange(workspaceId: string, start: Date, end: Date) {
    return this.txRepo
      .createQueryBuilder('t')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.occurred_at >= :start AND t.occurred_at < :end', {
        start,
        end,
      })
      .getCount();
  }

  async findOne(query: any) {
    return this.txRepo.findOne({ where: query });
  }

  create(data: any): Transaction {
    return this.txRepo.create(data) as any;
  }

  async save(entity: Transaction): Promise<Transaction> {
    return this.txRepo.save(entity);
  }

  async softDelete(id: string) {
    return this.txRepo.softDelete({ id });
  }

  async findAccount(id: string, workspaceId: string) {
    return this.accountRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
  }

  async findCategory(id: string, workspaceId: string) {
    // Find category that belongs to this workspace OR is global (workspaceId = null)
    return this.categoryRepo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('(c.workspace_id = :workspaceId OR c.workspace_id IS NULL)', {
        workspaceId,
      })
      .getOne();
  }

  async findTag(id: string, workspaceId: string) {
    return this.tagRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
  }

  async findTags(ids: string[], workspaceId: string) {
    return this.tagRepo.find({
      where: { id: ids as any, workspaceId, deletedAt: IsNull() as any },
    });
  }

  async findTransactionTags(transactionId: string) {
    return this.txTagRepo.find({ where: { transactionId } });
  }

  async deleteTransactionTags(transactionId: string) {
    return this.txTagRepo.delete({ transactionId });
  }

  createTransactionTag(data: any): TransactionTag {
    return this.txTagRepo.create(data) as any;
  }

  async saveTransactionTag(entity: TransactionTag): Promise<TransactionTag> {
    return this.txTagRepo.save(entity);
  }

  getRepository() {
    return this.txRepo;
  }

  getDataSource() {
    return this.dataSource;
  }
}
