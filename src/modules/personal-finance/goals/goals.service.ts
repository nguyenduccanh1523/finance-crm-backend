import { Injectable } from '@nestjs/common';
import { GoalsRepository } from './goals.repository';
import { GoalTransactionsRepository } from './goal-transactions.repository';
import { AccountsRepository } from '../accounts/accounts.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { ExchangeRateService } from '../common/exchange-rate.service';
import { personalErrors } from '../common/personal.errors';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AllocateGoalDto } from './dto/allocate-goal.dto';
import { WithdrawGoalDto } from './dto/withdraw-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly repo: GoalsRepository,
    private readonly goalTransactionsRepo: GoalTransactionsRepository,
    private readonly accountsRepo: AccountsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.list(workspaceId);
  }

  async getOne(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const goal = await this.repo.findOne(id, workspaceId);
    if (!goal) throw personalErrors.resourceNotFound('goal');
    return goal;
  }

  async create(user: any, dto: CreateGoalDto) {
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

    const entity = this.repo.create({
      workspaceId,
      accountId,
      name: dto.name,
      targetAmountCents: dto.targetAmountCents,
      targetDate: dto.targetDate,
      status: dto.status,
      currentAmountCents: dto.currentAmountCents ?? 0,
      currency: account.currency, // ← Lấy từ account
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateGoalDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const g = await this.repo.findOne(id, workspaceId);
    if (!g) throw personalErrors.resourceNotFound('goal');

    if (dto.name !== undefined) g.name = dto.name;
    if (dto.targetAmountCents !== undefined)
      g.targetAmountCents = dto.targetAmountCents;
    if (dto.targetDate !== undefined) g.targetDate = dto.targetDate;
    if (dto.currentAmountCents !== undefined)
      g.currentAmountCents = dto.currentAmountCents;
    if (dto.status !== undefined) g.status = dto.status;

    return this.repo.save(g);
  }

  /**
   * Phân bổ tiền từ account vào goal
   * 1. Kiểm tra account có balance đủ không (cùng currency)
   * 2. Trừ tiền từ account
   * 3. Cộng tiền vào goal
   * 4. Tạo GoalTransaction record
   */
  async allocate(user: any, goalId: string, dto: AllocateGoalDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // 1. Lấy goal
    const goal = await this.repo.findOne(goalId, workspaceId);
    if (!goal) throw personalErrors.resourceNotFound('goal');

    // 2. Lấy account của goal
    const account = await this.accountsRepo.findOne(
      goal.accountId,
      workspaceId,
    );
    if (!account) throw personalErrors.resourceNotFound('account');

    // 3. Kiểm tra balance trong account
    const amountToDeduct = dto.amountCents;
    const accountBalance = Number(account.currentBalanceCents) || 0;

    if (accountBalance < amountToDeduct) {
      throw personalErrors.invalidInput(
        `Số dư tài khoản (${goal.currency} ${(accountBalance / 100).toLocaleString('vi-VN')}) không đủ để phân bổ ${goal.currency} ${(amountToDeduct / 100).toLocaleString('vi-VN')}`,
      );
    }

    // 4. Cập nhật goal balance
    const previousGoalBalance = Number(goal.currentAmountCents) || 0;
    goal.currentAmountCents = previousGoalBalance + amountToDeduct;
    await this.repo.save(goal);

    // 5. Trừ từ account
    account.currentBalanceCents = accountBalance - amountToDeduct;
    await this.accountsRepo.save(account);

    // 6. Tạo Transaction record (GOAL_ALLOCATION)
    const transaction = this.transactionsRepo.create({
      workspaceId,
      accountId: goal.accountId,
      type: 'GOAL_ALLOCATION',
      amountCents: amountToDeduct,
      currency: goal.currency,
      note: `Allocate to ${goal.name}`,
      occurredAt: new Date(),
    });
    const savedTransaction = await this.transactionsRepo.save(transaction);

    // 7. Tạo GoalTransaction record
    await this.goalTransactionsRepo.create({
      goalId,
      transactionId: savedTransaction.id,
      type: 'ALLOCATION',
      amountCents: amountToDeduct,
      note: dto.note || undefined,
    });

    // 8. Return kết quả
    return {
      goalId,
      previousBalance: previousGoalBalance,
      newBalance: goal.currentAmountCents,
      allocatedAmount: amountToDeduct,
      currency: goal.currency,
      accountId: goal.accountId,
      transactionType: 'GOAL_ALLOCATION',
      createdAt: new Date(),
    };
  }

  /**
   * Rút tiền từ goal về account
   * 1. Kiểm tra goal có balance đủ không
   * 2. Trừ tiền từ goal
   * 3. Cộng tiền vào account
   * 4. Tạo GoalTransaction record
   */
  async withdraw(user: any, goalId: string, dto: WithdrawGoalDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // 1. Lấy goal
    const goal = await this.repo.findOne(goalId, workspaceId);
    if (!goal) throw personalErrors.resourceNotFound('goal');

    // 2. Kiểm tra goal balance đủ không
    const goalBalance = Number(goal.currentAmountCents) || 0;
    const amountToWithdraw = dto.amountCents;

    if (goalBalance < amountToWithdraw) {
      throw personalErrors.invalidInput(
        `Số dư mục tiêu (${goal.currency} ${(goalBalance / 100).toLocaleString('vi-VN')}) không đủ để rút ${goal.currency} ${(amountToWithdraw / 100).toLocaleString('vi-VN')}`,
      );
    }

    // 3. Cập nhật goal balance
    const previousGoalBalance = goalBalance;
    goal.currentAmountCents = goalBalance - amountToWithdraw;
    await this.repo.save(goal);

    // 4. Thêm lại vào account
    const account = await this.accountsRepo.findOne(
      goal.accountId,
      workspaceId,
    );
    if (account) {
      const accountBalance = Number(account.currentBalanceCents) || 0;
      account.currentBalanceCents = accountBalance + amountToWithdraw;
      await this.accountsRepo.save(account);
    }

    // 5. Tạo Transaction record (GOAL_WITHDRAWAL)
    const transaction = this.transactionsRepo.create({
      workspaceId,
      accountId: goal.accountId,
      type: 'GOAL_WITHDRAWAL',
      amountCents: amountToWithdraw,
      currency: goal.currency,
      note: `Withdraw from ${goal.name}`,
      occurredAt: new Date(),
    });
    const savedTransaction = await this.transactionsRepo.save(transaction);

    // 6. Tạo GoalTransaction record
    await this.goalTransactionsRepo.create({
      goalId,
      transactionId: savedTransaction.id,
      type: 'WITHDRAWAL',
      amountCents: amountToWithdraw,
      note: dto.note || undefined,
    });

    // 7. Return kết quả
    return {
      goalId,
      previousBalance: previousGoalBalance,
      newBalance: goal.currentAmountCents,
      withdrawnAmount: amountToWithdraw,
      currency: goal.currency,
      accountId: goal.accountId,
      transactionType: 'GOAL_WITHDRAWAL',
      createdAt: new Date(),
    };
  }

  /**
   * Xóa mục tiêu (soft delete)
   */
  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // 1. Lấy goal
    const goal = await this.repo.findOne(id, workspaceId);
    if (!goal) throw personalErrors.resourceNotFound('goal');

    // 2. Xóa goal (soft delete - set deletedAt)
    await this.repo.softDelete(id);

    // 3. Return kết quả
    return {
      id,
      message: 'Goal deleted successfully',
      deletedAt: new Date(),
    };
  }

  /**
   * Lấy lịch sử transaction của một goal
   */
  async getTransactionHistory(user: any, goalId: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // 1. Kiểm tra goal tồn tại
    const goal = await this.repo.findOne(goalId, workspaceId);
    if (!goal) throw personalErrors.resourceNotFound('goal');

    // 2. Lấy transaction history
    const transactions = await this.goalTransactionsRepo.getHistory(goalId);

    // 3. Format response
    const formatted = transactions.map((t) => ({
      id: t.id,
      goalId: t.goalId,
      type: t.type,
      amountCents: Number(t.amountCents),
      amountFormatted: `${goal.currency} ${(Number(t.amountCents) / 100).toLocaleString('vi-VN')}`,
      recordedAt: t.recordedAt,
      note: t.note,
    }));

    return {
      goalId,
      goalName: goal.name,
      currency: goal.currency,
      totalTransactions: formatted.length,
      transactions: formatted,
      summary: {
        totalAllocated:
          await this.goalTransactionsRepo.getTotalAllocated(goalId),
        totalWithdrawn:
          await this.goalTransactionsRepo.getTotalWithdrawn(goalId),
      },
    };
  }
}
