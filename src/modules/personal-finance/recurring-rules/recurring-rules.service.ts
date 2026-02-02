import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { RecurringRule } from '../entities/recurring-rule.entity';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { personalErrors } from '../common/personal.errors';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

@Injectable()
export class RecurringRulesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RecurringRule)
    private readonly repo: Repository<RecurringRule>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { nextRunAt: 'ASC' as any },
    });
  }

  async create(user: any, dto: CreateRecurringRuleDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const used = await this.repo.count({
      where: { workspaceId: ws.id, deletedAt: IsNull() as any },
    });
    await this.policy.assertQuota(user, PersonalQuotaKeys.RECURRING_MAX, used);

    const acc = await this.accountRepo.findOne({
      where: {
        id: dto.accountId,
        workspaceId: ws.id,
        deletedAt: IsNull() as any,
      },
    });
    if (!acc) throw personalErrors.invalidInput('accountId không hợp lệ.');

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

    const entity = this.repo.create({
      workspaceId: ws.id,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      amountCents: dto.amountCents,
      currency: dto.currency ?? acc.currency,
      rrule: dto.rrule,
      nextRunAt: new Date(dto.nextRunAt),
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateRecurringRuleDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);
    const rule = await this.repo.findOne({
      where: { id, workspaceId: ws.id, deletedAt: IsNull() as any },
    });
    if (!rule) throw personalErrors.resourceNotFound('recurring rule');

    if (dto.accountId) {
      const acc = await this.accountRepo.findOne({
        where: {
          id: dto.accountId,
          workspaceId: ws.id,
          deletedAt: IsNull() as any,
        },
      });
      if (!acc) throw personalErrors.invalidInput('accountId không hợp lệ.');
      rule.accountId = dto.accountId;
      if (!dto.currency) rule.currency = acc.currency;
    }
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const cat = await this.categoryRepo.findOne({
          where: {
            id: dto.categoryId,
            workspaceId: ws.id,
            deletedAt: IsNull() as any,
          },
        });
        if (!cat) throw personalErrors.invalidInput('categoryId không hợp lệ.');
        rule.categoryId = dto.categoryId;
      } else {
        rule.categoryId = undefined;
      }
    }
    if (dto.type !== undefined) rule.type = dto.type;
    if (dto.amountCents !== undefined) rule.amountCents = dto.amountCents;
    if (dto.currency !== undefined) rule.currency = dto.currency;
    if (dto.rrule !== undefined) rule.rrule = dto.rrule;
    if (dto.nextRunAt !== undefined) rule.nextRunAt = new Date(dto.nextRunAt);
    if (dto.endAt !== undefined)
      rule.endAt = dto.endAt ? new Date(dto.endAt) : undefined;

    return this.repo.save(rule);
  }

  async remove(user: any, id: string) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);
    const rule = await this.repo.findOne({
      where: { id, workspaceId: ws.id, deletedAt: IsNull() as any },
    });
    if (!rule) throw personalErrors.resourceNotFound('recurring rule');
    await this.repo.softDelete({ id });
    return { ok: true };
  }

  /**
   * Cron job entrypoint - call this from a scheduled task.
   * It will:
   * - find due rules (nextRunAt <= now)
   * - create a transaction
   * - compute nextRunAt using rrule
   */
  async runDueRules(now = new Date()) {
    const due = await this.repo.find({
      where: {
        deletedAt: IsNull() as any,
        nextRunAt: LessThanOrEqual(now) as any,
      },
      take: 200,
      order: { nextRunAt: 'ASC' as any },
    });

    for (const rule of due) {
      if (rule.endAt && rule.endAt < now) continue;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const tx = queryRunner.manager.create(Transaction, {
          workspaceId: rule.workspaceId,
          accountId: rule.accountId,
          type: rule.type as any,
          amountCents: rule.amountCents,
          currency: rule.currency,
          occurredAt: now,
          categoryId: rule.categoryId,
          note: 'Recurring',
        });
        await queryRunner.manager.save(tx);

        // update account balance
        if (rule.type === (TransactionType.INCOME as any)) {
          await queryRunner.manager.increment(
            Account,
            { id: rule.accountId },
            'currentBalanceCents',
            Number(rule.amountCents),
          );
        } else {
          await queryRunner.manager.increment(
            Account,
            { id: rule.accountId },
            'currentBalanceCents',
            -Number(rule.amountCents),
          );
        }

        // compute next run (using rrule)
        const next = this.computeNextRunAt(rule.rrule, now);
        if (next) {
          rule.nextRunAt = next;
          await queryRunner.manager.save(rule);
        } else {
          // no next -> soft delete
          await queryRunner.manager.softDelete(RecurringRule, { id: rule.id });
        }

        await queryRunner.commitTransaction();
      } catch (e) {
        await queryRunner.rollbackTransaction();
        // swallow or log; for now just continue
      } finally {
        await queryRunner.release();
      }
    }

    return { ok: true, processed: due.length };
  }

  private computeNextRunAt(rruleStr: string, from: Date): Date | null {
    // runtime require to avoid types friction
    try {
      const { RRule } = require('rrule');
      // Accept either "RRULE:FREQ=..." or raw "FREQ=..."
      const raw = rruleStr.startsWith('RRULE:')
        ? rruleStr.replace(/^RRULE:/, '')
        : rruleStr;
      const rule = RRule.fromString(raw);
      const next = rule.after(from, true);
      return next ?? null;
    } catch {
      return null;
    }
  }
}
