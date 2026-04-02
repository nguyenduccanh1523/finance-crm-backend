import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetTransaction } from '../entities/budget-transaction.entity';

@Injectable()
export class BudgetTransactionsRepository {
  constructor(
    @InjectRepository(BudgetTransaction)
    private readonly repo: Repository<BudgetTransaction>,
  ) {}

  /**
   * Link a transaction to a budget
   * This records which budget an expense transaction affects
   */
  async linkTransactionToBudget(data: {
    budgetId: string;
    transactionId: string;
    amountCents: number;
  }): Promise<BudgetTransaction> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /**
   * Get all transactions linked to a budget
   */
  async getTransactionsForBudget(
    budgetId: string,
  ): Promise<BudgetTransaction[]> {
    return this.repo.find({
      where: { budgetId },
      order: { recordedAt: 'DESC' as any },
      relations: ['transaction'],
    });
  }

  /**
   * Get total amount spent against a budget
   */
  async getTotalSpentAgainstBudget(budgetId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('bt')
      .select('SUM(bt.amount_cents)', 'total')
      .where('bt.budget_id = :budgetId', { budgetId })
      .getRawOne();
    return Number(result?.total ?? 0);
  }

  /**
   * Check if transaction is already linked to a budget
   */
  async isTransactionLinked(
    budgetId: string,
    transactionId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: { budgetId, transactionId },
    });
    return count > 0;
  }

  /**
   * Remove link between transaction and budget (when transaction is deleted)
   */
  async unlinkTransaction(
    budgetId: string,
    transactionId: string,
  ): Promise<void> {
    await this.repo.delete({ budgetId, transactionId });
  }

  /**
   * Get repository for direct queries
   */
  getRepository(): Repository<BudgetTransaction> {
    return this.repo;
  }
}
