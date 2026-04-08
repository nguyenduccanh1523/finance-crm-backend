import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GoalTransaction,
  GoalTransactionType,
} from '../entities/goal-transaction.entity';

@Injectable()
export class GoalTransactionsRepository {
  constructor(
    @InjectRepository(GoalTransaction)
    private readonly repo: Repository<GoalTransaction>,
  ) {}

  /**
   * Tạo transaction record cho goal
   */
  async create(data: {
    goalId: string;
    transactionId: string;
    type: GoalTransactionType;
    amountCents: number;
    note?: string;
  }): Promise<GoalTransaction> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /**
   * Lấy lịch sử transaction của một goal
   */
  async getHistory(goalId: string): Promise<GoalTransaction[]> {
    return this.repo.find({
      where: { goalId },
      order: { recordedAt: 'DESC' as any },
      relations: ['transaction'],
    });
  }

  /**
   * Lấy tổng số tiền đã allocate cho goal
   */
  async getTotalAllocated(goalId: string): Promise<number> {
    const result = await this.repo.find({
      where: { goalId, type: 'ALLOCATION' as any },
      select: ['amountCents'],
    });
    return result.reduce((sum, r) => sum + Number(r.amountCents), 0);
  }

  /**
   * Lấy tổng số tiền đã withdraw từ goal
   */
  async getTotalWithdrawn(goalId: string): Promise<number> {
    const result = await this.repo.find({
      where: { goalId, type: 'WITHDRAWAL' as any },
      select: ['amountCents'],
    });
    return result.reduce((sum, r) => sum + Number(r.amountCents), 0);
  }

  /**
   * Lấy số lần transactions
   */
  async getTransactionCount(goalId: string): Promise<number> {
    return this.repo.count({
      where: { goalId },
    });
  }

  /**
   * Get the underlying repository for direct queries
   */
  getRepository(): Repository<GoalTransaction> {
    return this.repo;
  }
}
