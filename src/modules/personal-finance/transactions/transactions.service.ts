import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';
import { Tag } from '../entities/tag.entity';
import { TransactionTag } from '../entities/transaction-tag.entity';
import { Category } from '../entities/category.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AdminCreateTransactionDto } from './dto/admin-create-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';
import { personalErrors } from '../common/personal.errors';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(TransactionTag)
    private readonly txTagRepo: Repository<TransactionTag>,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
    private readonly accountsService: AccountsService,
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

  async list(user: any, q: ListTransactionsQuery) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.deleted_at IS NULL');

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

    qb.orderBy('t.occurred_at', 'DESC');

    return qb.getMany();
  }

  async create(user: any, dto: CreateTransactionDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // quota: transactions per month
    const occurred = new Date(dto.occurredAt);
    const { start, end } = this.monthRange(occurred);
    const used = await this.txRepo
      .createQueryBuilder('t')
      .where('t.workspace_id = :workspaceId', { workspaceId: ws.id })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.occurred_at >= :start AND t.occurred_at < :end', {
        start,
        end,
      })
      .getCount();
    await this.policy.assertQuota(user, PersonalQuotaKeys.TX_MONTHLY, used);

    // ownership checks
    const account = await this.accountRepo.findOne({
      where: {
        id: dto.accountId,
        workspaceId: ws.id,
        deletedAt: IsNull() as any,
      },
    });
    if (!account) throw personalErrors.invalidInput('accountId không hợp lệ.');

    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: {
          id: dto.categoryId,
          workspaceId: ws.id,
          deletedAt: IsNull() as any,
        },
      });
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
      const toAcc = await this.accountRepo.findOne({
        where: {
          id: dto.transferAccountId,
          workspaceId: ws.id,
          deletedAt: IsNull() as any,
        },
      });
      if (!toAcc)
        throw personalErrors.invalidInput('transferAccountId không hợp lệ.');
    }

    const currency = dto.currency ?? account.currency;

    const queryRunner = this.dataSource.createQueryRunner();
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
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async update(user: any, id: string, dto: UpdateTransactionDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const queryRunner = this.dataSource.createQueryRunner();
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
        if (!dto.currency) existing.currency = acc.currency;
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
      if (dto.currency !== undefined) existing.currency = dto.currency;
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
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(user: any, id: string) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await queryRunner.manager.findOne(Transaction, {
        where: { id, workspaceId: ws.id, deletedAt: IsNull() as any },
      });
      if (!existing) throw personalErrors.resourceNotFound('transaction');

      // revert balance
      await this.applyBalance(queryRunner.manager, existing, -1);

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

  // -------- ADMIN --------
  async adminCreate(userId: string, dto: AdminCreateTransactionDto) {
    // admin DTO optional: ensure workspace + default account if missing
    const ws = await this.wsService.getOrCreateByUserId(userId);
    const acc = dto.accountId
      ? await this.accountRepo.findOne({
          where: {
            id: dto.accountId,
            workspaceId: ws.id,
            deletedAt: IsNull() as any,
          },
        })
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
}
