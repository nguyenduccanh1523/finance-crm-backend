import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from '../entities/transaction.entity';
import { TransactionTag } from '../entities/transaction-tag.entity';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import { Tag } from '../entities/tag.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetTransaction } from '../entities/budget-transaction.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AdminCreateTransactionDto } from './dto/admin-create-transaction-unified.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';
import { personalErrors } from '../common/personal.errors';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { AccountsService } from '../accounts/accounts.service';
import { BudgetTransactionsRepository } from '../budgets/budget-transactions.repository';
import { GoalTransactionsRepository } from '../goals/goal-transactions.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly repo: TransactionsRepository,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
    private readonly accountsService: AccountsService,
    private readonly budgetTxRepo: BudgetTransactionsRepository,
    private readonly goalTxRepo: GoalTransactionsRepository,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
  ) {}

  private monthRange(date: Date) {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0),
    );
    return { start, end };
  }

  /**
   * Link transaction to budget if it's an EXPENSE transaction with a category
   * This creates a BudgetTransaction record to track spending against budgets
   * MUST execute within transaction context (using queryRunner.manager)
   */
  private async linkToBudgetIfApplicable(
    manager: any,
    tx: Transaction,
    workspaceId: string,
  ) {
    try {
      // Only EXPENSE transactions with categoryId should be linked to budget
      if (tx.type !== (TransactionType.EXPENSE as any) || !tx.categoryId) {
        return;
      }

      // Get period month in YYYY-MM-DD format (first day of the month)
      const year = tx.occurredAt.getUTCFullYear();
      const month = String(tx.occurredAt.getUTCMonth() + 1).padStart(2, '0');
      const periodMonth = `${year}-${month}-01`;

      // Try 1: Find budget for this specific category
      let budget = await manager.findOne(Budget, {
        where: {
          workspaceId,
          categoryId: tx.categoryId,
          periodMonth,
          accountId: tx.accountId,
        },
      });

      // Try 2: If no specific budget, find budget for all categories (categoryId = NULL)
      if (!budget) {
        budget = await manager.findOne(Budget, {
          where: {
            workspaceId,
            categoryId: null as any,
            periodMonth,
            accountId: tx.accountId,
          },
        });
      }

      if (!budget) {
        return;
      }

      const budgetTx = manager.create(BudgetTransaction, {
        budgetId: budget.id,
        transactionId: tx.id,
        amountCents: tx.amountCents,
        recordedAt: new Date(),
      });
      const saved = await manager.save(budgetTx);
    } catch (err) {
      console.error('[linkToBudgetIfApplicable] ERROR:', {
        message: err.message,
        code: err.code,
        detail: err.detail,
        constraint: err.constraint,
      });
    }
  }

  async list(user: any, q: ListTransactionsQuery) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // Pagination defaults
    const page = q.page || 1;
    const limit = Math.min(q.limit || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = q.sortBy || 'occurredAt';
    const order = q.order || 'DESC';

    // Map front-end column names to entity property names
    const sortColumnMap = {
      occurredAt: 't.occurredAt',
      amountCents: 't.amountCents',
      createdAt: 't.createdAt',
      updatedAt: 't.updatedAt',
    };
    const orderColumn = sortColumnMap[sortBy] || 't.occurredAt';

    const qb = this.repo
      .getQueryBuilder()
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL');

    // Filters
    if (q.from)
      qb.andWhere('t.occurred_at >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('t.occurred_at <= :to', { to: new Date(q.to) });
    if (q.accountId)
      qb.andWhere('t.account_id = :accountId', { accountId: q.accountId });
    if (q.categoryId)
      qb.andWhere('t.category_id = :categoryId', { categoryId: q.categoryId });
    if (q.type) qb.andWhere('t.type = :type', { type: q.type });
    if (q.q)
      qb.andWhere('(t.note ILIKE :qq OR t.counterparty ILIKE :qq)', {
        qq: `%${q.q}%`,
      });

    // Sorting and Pagination
    qb.orderBy(orderColumn, order).skip(skip).take(limit);

    const [transactions, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'Success',
      data: this.transformTransactionsWithTags(transactions),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(user: any, dto: CreateTransactionDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // quota: transactions per month
    const occurred = new Date(dto.occurredAt);
    const { start, end } = this.monthRange(occurred);
    const used = await this.repo.countByMonthRange(ws.id, start, end);
    await this.policy.assertQuota(user, PersonalQuotaKeys.TX_MONTHLY, used);

    // ownership checks
    const account = await this.repo.findAccount(dto.accountId, ws.id);
    if (!account) throw personalErrors.invalidInput('accountId không hợp lệ.');

    if (dto.categoryId) {
      const cat = await this.repo.findCategory(dto.categoryId, ws.id);
      if (!cat) throw personalErrors.invalidInput('categoryId không hợp lệ.');
    }

    if (dto.type === (TransactionType.TRANSFER as any)) {
      if (!dto.transferAccountId)
        throw personalErrors.invalidInput(
          'transferAccountId là bắt buộc khi type=TRANSFER.',
        );
      if (dto.transferAccountId === dto.accountId)
        throw personalErrors.invalidInput(
          'transferAccountId phải khác accountId.',
        );
      const toAcc = await this.repo.findAccount(dto.transferAccountId, ws.id);
      if (!toAcc)
        throw personalErrors.invalidInput('transferAccountId không hợp lệ.');
    }

    // Always use account currency to ensure data integrity
    const currency = account.currency;

    const dataSource = this.repo.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const tx = queryRunner.manager.create(Transaction, {
        workspaceId: ws.id,
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency,
        occurredAt: new Date(dto.occurredAt),
        categoryId: dto.categoryId,
        note: dto.note,
        counterparty: dto.counterparty,
        transferAccountId: dto.transferAccountId,
      });
      const saved = await queryRunner.manager.save(tx);

      // apply balance effects
      await this.applyBalance(queryRunner.manager, saved, +1);

      // link to budget if applicable (EXPENSE with categoryId)
      await this.linkToBudgetIfApplicable(queryRunner.manager, saved, ws.id);

      // tags
      if (dto.tagIds?.length) {
        await this.replaceTags(
          queryRunner.manager,
          ws.id,
          saved.id,
          dto.tagIds,
        );
      }

      await queryRunner.commitTransaction();
      // Reload with tags
      return this.getById(user, saved.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getById(user: any, id: string) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const tx = await this.repo.findById(id, ws.id);
    if (!tx) throw personalErrors.resourceNotFound('transaction');
    return this.transformTransactionWithTags(tx);
  }

  async update(user: any, id: string, dto: UpdateTransactionDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const dataSource = this.repo.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await queryRunner.manager.findOne(Transaction, {
        where: { id, workspaceId: ws.id, deletedAt: IsNull() as any },
      });
      if (!existing) throw personalErrors.resourceNotFound('transaction');

      // revert old balance
      await this.applyBalance(queryRunner.manager, existing, -1);

      // validate ownership if changing ids
      if (dto.accountId) {
        const acc = await queryRunner.manager.findOne(Account, {
          where: {
            id: dto.accountId,
            workspaceId: ws.id,
            deletedAt: IsNull() as any,
          },
        });
        if (!acc) throw personalErrors.invalidInput('accountId không hợp lệ.');
        existing.accountId = dto.accountId;
        // Always use the account's currency when account changes
        existing.currency = acc.currency;
      }

      if (dto.categoryId !== undefined) {
        if (dto.categoryId) {
          const cat = await queryRunner.manager.findOne(Category, {
            where: {
              id: dto.categoryId,
              workspaceId: ws.id,
              deletedAt: IsNull() as any,
            },
          });
          if (!cat)
            throw personalErrors.invalidInput('categoryId không hợp lệ.');
          existing.categoryId = dto.categoryId;
        } else {
          existing.categoryId = undefined;
        }
      }

      if (dto.type !== undefined) existing.type = dto.type;
      if (dto.amountCents !== undefined) existing.amountCents = dto.amountCents;
      // Currency is always from account, not user-overridable
      if (dto.occurredAt !== undefined)
        existing.occurredAt = new Date(dto.occurredAt);
      if (dto.note !== undefined) existing.note = dto.note;
      if (dto.counterparty !== undefined)
        existing.counterparty = dto.counterparty;

      if (dto.transferAccountId !== undefined) {
        existing.transferAccountId = dto.transferAccountId;
      }

      // validate transfer rules after updates
      if (existing.type === (TransactionType.TRANSFER as any)) {
        if (!existing.transferAccountId)
          throw personalErrors.invalidInput(
            'transferAccountId là bắt buộc khi type=TRANSFER.',
          );
        if (existing.transferAccountId === existing.accountId)
          throw personalErrors.invalidInput(
            'transferAccountId phải khác accountId.',
          );
        const toAcc = await queryRunner.manager.findOne(Account, {
          where: {
            id: existing.transferAccountId,
            workspaceId: ws.id,
            deletedAt: IsNull() as any,
          },
        });
        if (!toAcc)
          throw personalErrors.invalidInput('transferAccountId không hợp lệ.');
      }

      const saved = await queryRunner.manager.save(existing);

      // re-apply new balance
      await this.applyBalance(queryRunner.manager, saved, +1);

      // Update budget linking: unlink old, link new if applicable
      // First, unlink all existing budget links for this transaction (within transaction context)
      await queryRunner.manager.delete(BudgetTransaction, {
        transactionId: id,
      });
      // Then link to new budget if applicable
      await this.linkToBudgetIfApplicable(queryRunner.manager, saved, ws.id);

      // tags replace
      if (dto.tagIds !== undefined) {
        await this.replaceTags(
          queryRunner.manager,
          ws.id,
          saved.id,
          dto.tagIds ?? [],
        );
      }

      await queryRunner.commitTransaction();
      // Reload with tags
      return this.getById(user, saved.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(user: any, id: string) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const dataSource = this.repo.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await queryRunner.manager.findOne(Transaction, {
        where: { id, workspaceId: ws.id, deletedAt: IsNull() as any },
      });
      if (!existing) throw personalErrors.resourceNotFound('transaction');

      // revert balance
      await this.applyBalance(queryRunner.manager, existing, -1);

      // unlink from budgets (within transaction context)
      await queryRunner.manager.delete(BudgetTransaction, {
        transactionId: id,
      });

      await queryRunner.manager.softDelete(Transaction, { id });
      await queryRunner.manager.delete(TransactionTag, { transactionId: id });

      await queryRunner.commitTransaction();
      return { ok: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  // -------- ADMIN - Unified Endpoint --------
  async adminCreate(dto: AdminCreateTransactionDto) {
    // Route by scope
    if (dto.scope === 'workspace') {
      if (!dto.workspaceId) {
        throw personalErrors.invalidInput(
          'workspaceId required for workspace scope',
        );
      }
      return this.createWorkspaceTransaction(dto.workspaceId, dto);
    }

    if (dto.scope === 'user') {
      if (!dto.userId) {
        throw personalErrors.invalidInput('userId required for user scope');
      }
      return this.createUserTransaction(dto.userId, dto);
    }

    throw personalErrors.invalidInput('Invalid scope');
  }

  private async createWorkspaceTransaction(
    workspaceId: string,
    dto: AdminCreateTransactionDto,
  ) {
    // Get workspace to get userId
    const ws = await this.wsService.findById(workspaceId);
    if (!ws) throw personalErrors.resourceNotFound('workspace');

    // Ensure account
    const acc = dto.accountId
      ? await this.repo.findAccount(dto.accountId, workspaceId)
      : await this.accountsService.ensureDefaultAccount(ws.userId);

    if (!acc)
      throw personalErrors.invalidInput(
        'Không thể xác định account để tạo transaction.',
      );

    const currency = dto.currency ?? acc.currency;

    const txDto: CreateTransactionDto = {
      accountId: acc.id,
      type: (dto.type ?? (TransactionType.EXPENSE as any)) as any,
      amountCents: dto.amountCents ?? 0,
      currency,
      occurredAt: dto.occurredAt ?? new Date().toISOString(),
      categoryId: dto.categoryId,
      note: dto.note ?? 'Admin created',
      counterparty: dto.counterparty,
      transferAccountId: dto.transferAccountId,
      tagIds: dto.tagIds,
    };

    // bypass quota using SUPER_ADMIN role
    return this.create({ id: ws.userId, role: 'SUPER_ADMIN' }, txDto);
  }

  private async createUserTransaction(
    userId: string,
    dto: AdminCreateTransactionDto,
  ) {
    // admin DTO optional: ensure workspace + default account if missing
    const ws = await this.wsService.getOrCreateByUserId(userId);
    const acc = dto.accountId
      ? await this.repo.findAccount(dto.accountId, ws.id)
      : await this.accountsService.ensureDefaultAccount(userId);

    if (!acc)
      throw personalErrors.invalidInput(
        'Không thể xác định account để tạo transaction.',
      );

    const currency = dto.currency ?? acc.currency;

    const txDto: CreateTransactionDto = {
      accountId: acc.id,
      type: (dto.type ?? (TransactionType.EXPENSE as any)) as any,
      amountCents: dto.amountCents ?? 0,
      currency,
      occurredAt: dto.occurredAt ?? new Date().toISOString(),
      categoryId: dto.categoryId,
      note: dto.note ?? 'Admin created',
      counterparty: dto.counterparty,
      transferAccountId: dto.transferAccountId,
      tagIds: dto.tagIds,
    };

    // admin bypass quota by using role SUPER_ADMIN in policy, so it returns big quotas
    return this.create({ id: userId, role: 'SUPER_ADMIN' }, txDto);
  }

  // -------- helpers --------
  private transformTransactionWithTags(tx: Transaction): any {
    return {
      ...tx,
      workspace: tx.workspace
        ? {
            id: tx.workspace.id,
            name: tx.workspace.name,
            timezone: tx.workspace.timezone,
            defaultCurrency: tx.workspace.defaultCurrency,
          }
        : null,
      account: tx.account
        ? {
            id: tx.account.id,
            name: tx.account.name,
            type: tx.account.type,
            currency: tx.account.currency,
            openingBalanceCents: tx.account.openingBalanceCents,
            currentBalanceCents: tx.account.currentBalanceCents,
          }
        : null,
      category: tx.category
        ? {
            id: tx.category.id,
            name: tx.category.name,
            icon: tx.category.icon,
          }
        : null,
      tags:
        tx.transactionTags
          ?.filter((tt) => !tt.tag?.deletedAt) // Filter out deleted tags
          .map((tt) => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })) || [],
    };
  }

  private transformTransactionsWithTags(txs: Transaction[]): any[] {
    return txs.map((tx) => this.transformTransactionWithTags(tx));
  }

  private async replaceTags(
    manager: any,
    workspaceId: string,
    transactionId: string,
    tagIds: string[],
  ) {
    // validate tags belong to workspace
    if (tagIds.length) {
      const tags = await manager.find(Tag, {
        where: { id: tagIds as any, workspaceId, deletedAt: IsNull() as any },
      });
      if (tags.length !== tagIds.length)
        throw personalErrors.invalidInput('tagIds có phần tử không hợp lệ.');
    }

    await manager.delete(TransactionTag, { transactionId });
    if (!tagIds.length) return;

    const rows = tagIds.map((tagId) => ({ transactionId, tagId }));
    await manager.insert(TransactionTag, rows);
  }

  private async applyBalance(manager: any, tx: Transaction, direction: 1 | -1) {
    // direction: +1 apply, -1 revert
    const amt = Number(tx.amountCents) * direction;

    if (tx.type === (TransactionType.INCOME as any)) {
      await manager.increment(
        Account,
        { id: tx.accountId },
        'currentBalanceCents',
        amt,
      );
      return;
    }

    if (tx.type === (TransactionType.EXPENSE as any)) {
      await manager.increment(
        Account,
        { id: tx.accountId },
        'currentBalanceCents',
        -amt,
      );
      return;
    }

    // TRANSFER: from accountId -> transferAccountId
    if (tx.type === (TransactionType.TRANSFER as any)) {
      if (!tx.transferAccountId)
        throw personalErrors.invalidInput(
          'transferAccountId missing for TRANSFER.',
        );
      // from decreases, to increases
      await manager.increment(
        Account,
        { id: tx.accountId },
        'currentBalanceCents',
        -amt,
      );
      await manager.increment(
        Account,
        { id: tx.transferAccountId },
        'currentBalanceCents',
        amt,
      );
    }
  }

  async getLinkedToBudget(
    user: any,
    budgetId: string,
    q: ListTransactionsQuery,
  ) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // Pagination defaults
    const page = q.page || 1;
    const limit = Math.min(q.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Query budget_transactions to get linked transaction IDs
    const [budgetTxs, total] = await this.budgetTxRepo
      .getRepository()
      .createQueryBuilder('bt')
      .where('bt.budget_id = :budgetId', { budgetId })
      .orderBy('bt.recorded_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Get transaction IDs
    const txIds = budgetTxs.map((bt) => bt.transactionId);

    // Get transactions with full data
    let transactions: Transaction[] = [];
    if (txIds.length > 0) {
      transactions = await this.repo
        .getQueryBuilder()
        .where('t.id IN (:...txIds)', { txIds })
        .andWhere('t.workspace_id = :workspaceId', { workspaceId })
        .andWhere('t.deleted_at IS NULL')
        .orderBy('t.occurred_at', 'DESC')
        .getMany();
    }

    return {
      statusCode: 200,
      message: 'Success',
      data: this.transformTransactionsWithTags(transactions),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLinkedToGoal(user: any, goalId: string, q: ListTransactionsQuery) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // Pagination defaults
    const page = q.page || 1;
    const limit = Math.min(q.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Query goal_transactions to get linked transaction IDs with pagination
    const [goalTxs, total] = await this.goalTxRepo
      .getRepository()
      .createQueryBuilder('gt')
      .where('gt.goal_id = :goalId', { goalId })
      .orderBy('gt.recorded_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Get transaction IDs
    const txIds = goalTxs.map((gt) => gt.transactionId);

    // Get transactions with full data
    let transactions: Transaction[] = [];
    if (txIds.length > 0) {
      transactions = await this.repo
        .getQueryBuilder()
        .where('t.id IN (:...txIds)', { txIds })
        .andWhere('t.workspace_id = :workspaceId', { workspaceId })
        .andWhere('t.deleted_at IS NULL')
        .orderBy('t.occurred_at', 'DESC')
        .getMany();
    }

    return {
      statusCode: 200,
      message: 'Success',
      data: this.transformTransactionsWithTags(transactions),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
