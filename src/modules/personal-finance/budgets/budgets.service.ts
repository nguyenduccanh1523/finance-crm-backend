import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from './budgets.repository';
import { AccountsRepository } from '../accounts/accounts.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { personalErrors } from '../common/personal.errors';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly repo: BudgetsRepository,
    private readonly accountsRepo: AccountsRepository,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.list(workspaceId);
  }

  async getOne(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const budget = await this.repo.findOne({ id, workspaceId });
    if (!budget) throw personalErrors.resourceNotFound('budget');
    return budget;
  }

  async upsert(user: any, dto: CreateBudgetDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // accountId phải được truyền vào từ frontend (hoặc lấy account primary)
    let accountId = (dto as any).accountId;

    if (!accountId) {
      // Nếu không truyền, lấy account primary của workspace
      const primaryAccount = await this.accountsRepo.findFirst(workspaceId);
      if (!primaryAccount) throw personalErrors.resourceNotFound('account');
      accountId = primaryAccount.id;
    }

    const account = await this.accountsRepo.findOne(accountId, workspaceId);
    if (!account) throw personalErrors.resourceNotFound('account');

    const existing = await this.repo.findOne({
      workspaceId,
      periodMonth: dto.periodMonth,
      categoryId: dto.categoryId ?? null,
      accountId,
    } as any);

    if (existing) {
      existing.amountLimitCents = dto.amountLimitCents;
      existing.alertThresholdPercent =
        dto.alertThresholdPercent ?? existing.alertThresholdPercent;
      existing.currency = account.currency;
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      workspaceId,
      accountId,
      periodMonth: dto.periodMonth,
      categoryId: dto.categoryId,
      amountLimitCents: dto.amountLimitCents,
      alertThresholdPercent: dto.alertThresholdPercent ?? 80,
      currency: account.currency, // ← Lấy từ account
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateBudgetDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const b = await this.repo.findOne({ id, workspaceId });
    if (!b) throw personalErrors.resourceNotFound('budget');

    if (dto.amountLimitCents !== undefined)
      b.amountLimitCents = dto.amountLimitCents;
    if (dto.alertThresholdPercent !== undefined)
      b.alertThresholdPercent = dto.alertThresholdPercent;

    return this.repo.save(b);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const b = await this.repo.findOne({ id, workspaceId });
    if (!b) throw personalErrors.resourceNotFound('budget');
    await this.repo.delete({ id });
    return { ok: true };
  }
}
