import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Goal } from '../../entities/goal.entity';
import { Transaction } from '../../entities/transaction.entity';
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
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
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
   * Lấy dữ liệu lịch sử về việc đạt mục tiêu
   * Mô phỏng: Từ transactions gắn tag "goal" hoặc tracking updates
   */
  private async getGoalHistoricalData(
    goal: Goal,
  ): Promise<Array<{ date: Date; amount: number }>> {
    // Giả sử có tracking goal updates trong DB
    // Hoặc tính từ toàn bộ income timeline
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Query để lấy income transactions (giả sử goal là tiền kiếm được)
    // Trong thực tế, bạn có thể có bảng GoalProgress riêng
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select('DATE(t.occurredAt)', 'date')
      .addSelect('SUM(t.amountCents)', 'total')
      .where('t.workspaceId = :workspaceId', { workspaceId: goal.workspaceId })
      .andWhere('t.occurredAt >= :start', { start: threeMonthsAgo })
      .andWhere('t.type = :type', { type: 'INCOME' })
      .groupBy('DATE(t.occurredAt)')
      .orderBy('DATE(t.occurredAt)', 'ASC')
      .getRawMany();

    // Tính cumulative amount
    let cumulativeAmount = 0;
    const historicalData: Array<{ date: Date; amount: number }> = [];

    for (const row of result) {
      cumulativeAmount += parseInt(row.total || 0);
      historicalData.push({
        date: new Date(row.date),
        amount: cumulativeAmount,
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
    if (current >= target) {
      return 'COMPLETED';
    }

    const today = new Date();
    const daysLeft = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amountNeeded = target - current;
    const requiredVelocity = daysLeft > 0 ? amountNeeded / daysLeft : 0;

    if (velocity >= requiredVelocity) {
      return 'AHEAD';
    } else if (velocity > 0) {
      return 'ON_TRACK';
    } else {
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
