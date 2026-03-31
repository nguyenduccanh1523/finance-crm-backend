import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Goal } from '../../entities/goal.entity';
import { GoalTransaction } from '../../entities/goal-transaction.entity';
import {
  IGoalAnalyticsService,
  GoalProgress,
} from '../interfaces/analytics.interface';
import { FinancialCalculationService } from './financial-calculation.service';

/**
 * Goal Analytics Service
 * SOLID:
 * - Single Responsibility: Chỉ handle goal analysis
 * - Dependency Injection: Inject repositories và services
 */
@Injectable()
export class GoalAnalyticsService implements IGoalAnalyticsService {
  constructor(
    @InjectRepository(Goal) private goalRepo: Repository<Goal>,
    @InjectRepository(GoalTransaction)
    private goalTransactionRepo: Repository<GoalTransaction>,
    private calculationService: FinancialCalculationService,
  ) {}

  /**
   * Phân tích tiến độ tất cả goals
   */
  async analyzeGoalProgress(workspaceId: string): Promise<GoalProgress[]> {
    const goals = await this.goalRepo.find({
      where: { workspaceId, deletedAt: IsNull() },
    });

    const progressList: GoalProgress[] = [];

    for (const goal of goals) {
      console.log(
        `[DEBUG] Processing goal: id=${goal.id}, name=${goal.name}, currentAmount=${goal.currentAmountCents}, targetAmount=${goal.targetAmountCents}`,
      );

      // Lấy lịch sử đạt được mục tiêu
      const historicalData = await this.getGoalHistoricalData(goal);

      // Tính velocity
      const velocity = await this.calculateGoalVelocity(
        goal.id,
        historicalData,
      );

      // Tính ngày hoàn thành dự kiến
      const estimatedCompletionDate =
        this.calculationService.estimateCompletionDate(
          goal.targetAmountCents,
          goal.currentAmountCents,
          velocity,
        );

      // Kiểm tra ahead schedule
      const targetDate = new Date(goal.targetDate);
      const isAheadSchedule = this.calculationService.isAheadSchedule(
        targetDate,
        estimatedCompletionDate,
      );
      const daysAheadSchedule = isAheadSchedule
        ? this.calculationService.calculateDaysAheadSchedule(
            targetDate,
            estimatedCompletionDate,
          )
        : undefined;

      // Xác định trạng thái
      const status = this.determineGoalStatus(
        goal.currentAmountCents,
        goal.targetAmountCents,
        targetDate,
        velocity,
      );

      // Tính ngày còn lại
      const today = new Date();
      const daysLeft = Math.ceil(
        (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Tính % đạt được
      const percentageAchieved =
        (goal.currentAmountCents / goal.targetAmountCents) * 100;

      const progress: GoalProgress = {
        goalId: goal.id,
        name: goal.name,
        targetAmountCents: goal.targetAmountCents,
        currentAmountCents: goal.currentAmountCents,
        percentageAchieved,
        amountNeededCents: Math.max(
          0,
          goal.targetAmountCents - goal.currentAmountCents,
        ),
        daysLeft: Math.max(0, daysLeft),
        velocityPerDay: velocity,
        isAheadSchedule,
        daysAheadSchedule,
        estimatedCompletionDate,
        status,
      };

      progressList.push(progress);
    }

    return progressList;
  }

  /**
   * Tính tốc độ đạt mục tiêu (per ngày)
   */
  async calculateGoalVelocity(
    goalId: string,
    historicalData: Array<{ date: Date; amount: number }>,
  ): Promise<number> {
    if (historicalData.length < 2) return 0;

    // Tính từ ngày tạo goal đến hôm nay
    const goal = await this.goalRepo.findOne({ where: { id: goalId } });
    if (!goal) return 0;

    const createdDate = new Date(goal.createdAt);
    const today = new Date();
    const daysPassed = Math.ceil(
      (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysPassed === 0) return 0;

    // Nếu có dữ liệu lịch sử, tính từ đó
    if (historicalData.length >= 2) {
      const firstRecord = historicalData[0];
      const lastRecord = historicalData[historicalData.length - 1];
      const amountGain = lastRecord.amount - firstRecord.amount;
      const daysDiff = Math.ceil(
        (lastRecord.date.getTime() - firstRecord.date.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 0) return 0;
      return amountGain / daysDiff;
    }

    // Fallback: sử dụng currentAmount / daysPassed
    return goal.currentAmountCents / daysPassed;
  }

  /**
   * Dự báo ngày hoàn thành mục tiêu
   */
  async predictGoalCompletion(
    goalId: string,
    currentAmount: number,
    targetAmount: number,
    velocity: number,
  ): Promise<Date> {
    return this.calculationService.estimateCompletionDate(
      targetAmount,
      currentAmount,
      velocity,
    );
  }

  /**
   * Lấy dữ liệu lịch sử về việc allocate tiền vào mục tiêu
   * Query từ GoalTransaction (bridge table giữa Goal và Transaction)
   */
  private async getGoalHistoricalData(
    goal: Goal,
  ): Promise<Array<{ date: Date; amount: number }>> {
    // Query goal transactions (ALLOCATION & WITHDRAWAL)
    const goalTransactions = await this.goalTransactionRepo
      .createQueryBuilder('gt')
      .leftJoinAndSelect('gt.transaction', 't')
      .where('gt.goalId = :goalId', { goalId: goal.id })
      .orderBy('t.occurredAt', 'ASC')
      .getMany();

    // Nếu không có transactions, return empty
    if (!goalTransactions.length) {
      return [];
    }

    // Group by date và tính cumulative
    const dailyMap = new Map<string, number>();
    for (const gt of goalTransactions) {
      const dateStr = new Date(gt.transaction.occurredAt).toLocaleDateString(
        'en-CA',
      ); // YYYY-MM-DD format
      const amount =
        gt.type === 'ALLOCATION'
          ? gt.transaction.amountCents
          : -gt.transaction.amountCents;
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + amount);
    }

    // Tính cumulative amount
    let cumulativeAmount = 0;
    const historicalData: Array<{ date: Date; amount: number }> = [];

    const sortedDates = Array.from(dailyMap.keys()).sort();
    for (const dateStr of sortedDates) {
      const dailyAmount = dailyMap.get(dateStr) || 0;
      cumulativeAmount += dailyAmount;
      historicalData.push({
        date: new Date(dateStr),
        amount: Math.max(0, cumulativeAmount),
      });
    }

    return historicalData;
  }

  private determineGoalStatus(
    current: number,
    target: number,
    targetDate: Date,
    velocity: number,
  ): 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'COMPLETED' {
    // Ensure numbers (can be BigInt from DB)
    const currentNum = Number(current);
    const targetNum = Number(target);

    console.log(
      `[DEBUG] Goal Status: current=${currentNum}, target=${targetNum}, velocity=${velocity}`,
    );

    if (currentNum >= targetNum) {
      console.log(
        `[DEBUG] → Status = COMPLETED (${currentNum} >= ${targetNum})`,
      );
      return 'COMPLETED';
    }

    const today = new Date();
    const daysLeft = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amountNeeded = targetNum - currentNum;
    const requiredVelocity = daysLeft > 0 ? amountNeeded / daysLeft : 0;

    console.log(
      `[DEBUG] daysLeft=${daysLeft}, amountNeeded=${amountNeeded}, requiredVelocity=${requiredVelocity}`,
    );

    if (velocity >= requiredVelocity) {
      console.log(`[DEBUG] → Status = AHEAD`);
      return 'AHEAD';
    } else if (velocity > 0) {
      console.log(`[DEBUG] → Status = ON_TRACK`);
      return 'ON_TRACK';
    } else {
      console.log(`[DEBUG] → Status = BEHIND`);
      return 'BEHIND';
    }
  }

  /**
   * Gợi ý chiến lược để đạt mục tiêu nhanh hơn
   */
  async suggestGoalStrategy(goalId: string): Promise<any[]> {
    const goal = await this.goalRepo.findOne({ where: { id: goalId } });
    if (!goal) return [];

    const suggestions: any[] = [];
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amountRemaining = goal.targetAmountCents - goal.currentAmountCents;

    // Gợi ý 1: Nếu đang đi sau, cần tăng tốc
    if (daysRemaining > 0) {
      const requiredDailyRate = amountRemaining / daysRemaining;
      const currentVelocity =
        goal.currentAmountCents / Math.max(1, daysRemaining);

      if (currentVelocity < requiredDailyRate) {
        const increaseNeeded = (
          ((requiredDailyRate - currentVelocity) / currentVelocity) *
          100
        ).toFixed(1);
        suggestions.push({
          id: `${goalId}-speed-up`,
          title: 'Cần tăng tốc độ phân bổ tiền',
          description: `Để đạt target vào ${targetDate.toLocaleDateString()}, bạn cần phân bổ ₫${Math.ceil(requiredDailyRate).toLocaleString()} mỗi ngày (tăng ${increaseNeeded}% so với hiện tại)`,
          impact: 'POSITIVE',
          difficulty: 'HARD',
          estimatedResult: `Hoàn thành goal đúng hạn hoặc sớm hơn`,
        });
      }
    }

    // Gợi ý 2: Tính toán số tiền cần phân bổ hàng tuần
    if (daysRemaining > 7) {
      const weeklyAmount = Math.ceil(amountRemaining / (daysRemaining / 7));
      suggestions.push({
        id: `${goalId}-weekly-plan`,
        title: 'Lên kế hoạch phân bổ hàng tuần',
        description: `Phân bổ khoảng ₫${weeklyAmount.toLocaleString()} mỗi tuần sẽ giúp bạn đạt mục tiêu`,
        impact: 'POSITIVE',
        difficulty: 'EASY',
        estimatedResult: `Theo dõi tiến độ dễ dàng hơn`,
      });
    }

    // Gợi ý 3: Nếu đã gần xong
    if (goal.currentAmountCents >= goal.targetAmountCents * 0.75) {
      suggestions.push({
        id: `${goalId}-final-push`,
        title: 'Khát cuộc cuối cùng để hoàn thành!',
        description: `Chỉ cần thêm ₫${Math.ceil(amountRemaining).toLocaleString()} nữa để đạt mục tiêu!`,
        impact: 'POSITIVE',
        difficulty: 'EASY',
        estimatedResult: `Hoàn thành mục tiêu`,
      });
    }

    return suggestions;
  }
}
