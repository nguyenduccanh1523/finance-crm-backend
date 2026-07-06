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

  /**
   * Lấy tổng income & expense của tháng hiện tại VÀ tháng trước trong 1 query duy nhất.
   * Dùng CASE WHEN để tránh phải chạy 2 queries riêng.
   *
   * @param workspaceId
   * @param thisStart  - đầu tháng hiện tại (UTC)
   * @param thisEnd    - đầu tháng sau (exclusive, UTC)
   * @param lastStart  - đầu tháng trước (UTC)
   * @param lastEnd    - đầu tháng hiện tại (exclusive, UTC)
   */
  async getDashboardMonthlyStats(
    workspaceId: string,
    thisStart: Date,
    thisEnd: Date,
    lastStart: Date,
    lastEnd: Date,
  ): Promise<{
    thisIncomeCents: number;
    thisExpenseCents: number;
    lastIncomeCents: number;
    lastExpenseCents: number;
  }> {
    const result = await this.txRepo
      .createQueryBuilder('t')
      .select(
        // Tháng hiện tại
        `COALESCE(SUM(CASE WHEN t.occurred_at >= :thisStart AND t.occurred_at < :thisEnd AND t.type = 'INCOME'  THEN t.amount_cents ELSE 0 END), 0)`,
        'thisIncomeCents',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.occurred_at >= :thisStart AND t.occurred_at < :thisEnd AND t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0)`,
        'thisExpenseCents',
      )
      // Tháng trước
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.occurred_at >= :lastStart AND t.occurred_at < :lastEnd AND t.type = 'INCOME'  THEN t.amount_cents ELSE 0 END), 0)`,
        'lastIncomeCents',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.occurred_at >= :lastStart AND t.occurred_at < :lastEnd AND t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0)`,
        'lastExpenseCents',
      )
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL')
      // Filter range: tháng trước đến cuối tháng hiện tại
      .andWhere('t.occurred_at >= :lastStart AND t.occurred_at < :thisEnd', {
        lastStart,
        thisEnd,
      })
      .setParameter('thisStart', thisStart)
      .setParameter('lastStart', lastStart)
      .setParameter('lastEnd', lastEnd)
      .getRawOne();

    return {
      thisIncomeCents: Number(result?.thisIncomeCents ?? 0),
      thisExpenseCents: Number(result?.thisExpenseCents ?? 0),
      lastIncomeCents: Number(result?.lastIncomeCents ?? 0),
      lastExpenseCents: Number(result?.lastExpenseCents ?? 0),
    };
  }

  /**
   * Lấy hoạt động tài chính theo từng ngày trong 7 ngày gần nhất.
   * Bao gồm TẤT CẢ loại giao dịch: INCOME, EXPENSE, TRANSFER, budget, goal.
   * GROUP BY ngày → trả về mảng { date, totalCents }.
   */
  async getWeeklySpending(
    workspaceId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ date: string; totalCents: number }>> {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select(`TO_CHAR(t.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, 'date')
      .addSelect('COALESCE(SUM(t.amount_cents), 0)', 'totalCents')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL')
      // Bao gồm tất cả loại giao dịch – không lọc type
      .andWhere('t.occurred_at >= :from AND t.occurred_at < :to', { from, to })
      .groupBy(`TO_CHAR(t.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
      .orderBy(`TO_CHAR(t.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      date: r.date as string,
      totalCents: Number(r.totalCents),
    }));
  }

  /**
   * Lấy N transactions mới nhất (tất cả loại: INCOME/EXPENSE/TRANSFER/budget/goal).
   * Join category + account để lấy name hiển thị.
   *
   * LƯU Ý: Phải dùng entity property names trong .select() (camelCase),
   * KHÔNG dùng SQL column names (snake_case) – TypeORM sẽ không map được.
   * Ví dụ: 't.amountCents' ✅  |  't.amount_cents' ❌
   */
  async getRecentTransactions(
    workspaceId: string,
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      note: string | null;
      counterparty: string | null;
      type: string;
      amountCents: number;
      currency: string;
      occurredAt: Date;
      categoryName: string | null;
      categoryIcon: string | null;
      accountName: string | null;
    }>
  > {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .leftJoin('t.category', 'cat')
      .leftJoin('t.account', 'acc')
      .select([
        't.id',
        't.note',
        't.counterparty',
        't.type',
        't.amountCents',   // ✅ entity property name (camelCase)
        't.currency',
        't.occurredAt',    // ✅ entity property name (camelCase)
        'cat.name',
        'cat.icon',
        'acc.name',
      ])
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL')
      .orderBy('t.occurredAt', 'DESC')
      .limit(limit)
      .getMany();

    return rows.map((t) => ({
      id: t.id,
      note: t.note ?? null,
      counterparty: t.counterparty ?? null,
      type: t.type as string,
      amountCents: Number(t.amountCents),   // Bây giờ đã có giá trị
      currency: t.currency,
      occurredAt: t.occurredAt,
      categoryName: (t as any).category?.name ?? null,
      categoryIcon: (t as any).category?.icon ?? null,
      accountName: (t as any).account?.name ?? null,
    }));
  }
}

