import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Budget } from '../../entities/budget.entity';
import { Category } from '../../entities/category.entity';
import {
  IBudgetAnalyticsService,
  BudgetProgress,
  BudgetPrediction,
  Anomaly,
} from '../interfaces/analytics.interface';
import { FinancialCalculationService } from './financial-calculation.service';
import { BudgetsRepository } from '../../budgets/budgets.repository';
import { TransactionsRepository } from '../../transactions/transactions.repository';
import { CategoriesRepository } from '../../categories/categories.repository';

/**
 * Budget Analytics Service
 * SOLID:
 * - Single Responsibility: Chỉ handle budget analysis
 * - Dependency Injection: Inject repositories và services
 * - Interface Segregation: Implement IBudgetAnalyticsService
 */
@Injectable()
export class BudgetAnalyticsService implements IBudgetAnalyticsService {
  constructor(
    private budgetsRepository: BudgetsRepository,
    private transactionsRepository: TransactionsRepository,
    private categoriesRepository: CategoriesRepository,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    private calculationService: FinancialCalculationService,
  ) {}

  /**
   * Phân tích tiến độ tất cả budgets
   */
  async analyzeBudgetProgress(workspaceId: string): Promise<BudgetProgress[]> {
    const { items: budgets } = await this.budgetsRepository.list(
      workspaceId,
      1,
      999,
    );
    const progressList: BudgetProgress[] = [];

    for (const budget of budgets) {
      const progress = await this.getBudgetProgress(workspaceId, budget);
      progressList.push(progress);
    }

    return progressList;
  }

  /**
   * Lấy tiến độ của một budget
   */
  private async getBudgetProgress(
    workspaceId: string,
    budget: Budget,
  ): Promise<BudgetProgress> {
    const [periodStart, periodEnd] = this.getPeriodDateRange(
      budget.periodMonth,
    );

    // Lấy tổng chi tiêu trong kỳ
    const spentResult = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.accountId = :accountId', { accountId: budget.accountId })
      .andWhere('t.occurredAt >= :start AND t.occurredAt <= :end', {
        start: periodStart,
        end: periodEnd,
      })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .andWhere(budget.categoryId ? 't.categoryId = :categoryId' : '1=1', {
        categoryId: budget.categoryId,
      })
      .select('SUM(t.amountCents)', 'total')
      .getRawOne();

    const spentCents = parseInt(spentResult?.total || 0);
    const remainingCents = budget.amountLimitCents - spentCents;
    const percentageUsed = (spentCents / budget.amountLimitCents) * 100;

    // Xác định trạng thái
    const status = this.determineBudgetStatus(
      percentageUsed,
      budget.alertThresholdPercent,
    );

    // Tính ngày còn lại
    const daysLeftInMonth = this.calculationService.getDaysLeftInMonth(
      new Date(budget.periodMonth),
    );

    // Lấy tên category nếu có categoryId
    let categoryName: string | undefined;
    if (budget.categoryId) {
      const category = await this.categoriesRepository.findOne({
        id: budget.categoryId,
        workspaceId,
      });
      categoryName = category?.name;
    }

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName,
      limitCents: Number(budget.amountLimitCents),
      spentCents: Number(spentCents),
      remainingCents: Number(remainingCents),
      percentageUsed,
      status,
      daysLeftInMonth,
    };
  }

  /**
   * Dự báo vượt budget
   */
  async predictBudgetOverflow(
    workspaceId: string,
    budgetId: string,
  ): Promise<BudgetPrediction> {
    const budget = await this.budgetsRepository.findOne({
      id: budgetId,
      workspaceId,
    });
    if (!budget) throw new Error('Budget not found');

    const [periodStart, periodEnd] = this.getPeriodDateRange(
      budget.periodMonth,
    );
    const today = new Date();
    const daysElapsed = Math.ceil(
      (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysInMonth = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Lấy chi tiêu hiện tại
    const spentResult = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.accountId = :accountId', { accountId: budget.accountId })
      .andWhere('t.occurredAt >= :start AND t.occurredAt <= :end', {
        start: periodStart,
        end: today,
      })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .andWhere(budget.categoryId ? 't.categoryId = :categoryId' : '1=1', {
        categoryId: budget.categoryId,
      })
      .select('SUM(t.amountCents)', 'total')
      .getRawOne();

    const currentSpent = parseInt(spentResult?.total || 0);

    // Dự báo cuối tháng
    const predictedSpendCents = this.calculationService.forecastMonthEnd(
      currentSpent,
      daysElapsed,
      daysInMonth,
    );
    const overagePercentage =
      ((predictedSpendCents - budget.amountLimitCents) /
        budget.amountLimitCents) *
      100;
    const isOverBudget = predictedSpendCents > budget.amountLimitCents;

    // Tính xu hướng
    const historicalData = await this.getSpendingHistory(
      workspaceId,
      budgetId,
      7,
    ); // 7 ngày gần nhất
    const trend = this.calculationService.calculateMonthlyTrend(historicalData);
    const trendDirection = trend > 5 ? 'UP' : trend < -5 ? 'DOWN' : 'STABLE';

    // Tính ngày sẽ vượt
    const dailyRate = daysElapsed > 0 ? currentSpent / daysElapsed : 0;
    const daysUntilOverBudgetRaw = isOverBudget
      ? this.calculationService.calculateDaysUntilBudgetOverflow(
          currentSpent,
          budget.amountLimitCents,
          dailyRate,
        )
      : undefined;
    const daysUntilOverBudget =
      daysUntilOverBudgetRaw === null ? undefined : daysUntilOverBudgetRaw;

    // Confidence score (dựa vào số lượng data points)
    const dataPoints = daysElapsed;
    const confidence = this.calculationService.calculateConfidenceScore(
      dataPoints,
      7,
    );

    return {
      predictedSpendCents: Math.round(predictedSpendCents),
      overagePercentage: Math.round(overagePercentage * 10) / 10,
      isOverBudget,
      daysUntilOverBudget,
      trendDirection: trendDirection as 'UP' | 'DOWN' | 'STABLE',
      confidence: Math.round(confidence),
    };
  }

  /**
   * Phát hiện bất thường trong chi tiêu
   */
  async detectBudgetAnomalies(workspaceId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const { items: budgets } = await this.budgetsRepository.list(
      workspaceId,
      1,
      999,
    );

    for (const budget of budgets) {
      // 1. Phát hiện spending spike
      const spendingSpike = await this.detectSpendingSpike(workspaceId, budget);
      if (spendingSpike) anomalies.push(spendingSpike);

      // 2. Phát hiện pattern bất thường
      const unusualPattern = await this.detectUnusualPattern(
        workspaceId,
        budget,
      );
      if (unusualPattern) anomalies.push(unusualPattern);

      // 3. Phát hiện overspend theo danh mục
      const categoryOverspend = await this.detectCategoryOverspend(
        workspaceId,
        budget,
      );
      if (categoryOverspend) anomalies.push(categoryOverspend);
    }

    return anomalies;
  }

  /**
   * Phát hiện spending spike
   */
  private async detectSpendingSpike(
    workspaceId: string,
    budget: Budget,
  ): Promise<Anomaly | null> {
    // Lấy 14 ngày gần nhất
    const history = await this.getSpendingHistory(workspaceId, budget.id, 14);
    if (history.length < 7) return null;

    // Tính average và current
    const amounts = history.map((h) => h.amount);
    const average =
      amounts.slice(0, -1).reduce((a, b) => a + b, 0) / (amounts.length - 1);
    const current = amounts[amounts.length - 1];

    const spike = this.calculationService.calculatePercentageChange(
      average,
      current,
    );

    if (Math.abs(spike) >= 30) {
      return {
        type: 'SPENDING_SPIKE',
        title:
          spike > 0
            ? '💥 Chi tiêu tăng đột biến!'
            : '📉 Chi tiêu giảm đột biến',
        description:
          spike > 0
            ? `Chi phí ${budget.categoryId ? 'danh mục' : 'tổng'} tăng ${spike.toFixed(1)}% so với trung bình`
            : `Chi phí ${budget.categoryId ? 'danh mục' : 'tổng'} giảm ${Math.abs(spike).toFixed(1)}%`,
        severity: Math.abs(spike) > 50 ? 'HIGH' : 'MEDIUM',
        metricChange: Math.round(spike * 10) / 10,
        suggestedAction:
          spike > 0
            ? 'Kiểm tra chi tiêu gần đây và xem có thể cắt giảm không'
            : 'Tốt lắm! Tiếp tục duy trì',
      };
    }

    return null;
  }

  /**
   * Phát hiện pattern bất thường
   */
  private async detectUnusualPattern(
    workspaceId: string,
    budget: Budget,
  ): Promise<Anomaly | null> {
    const history = await this.getSpendingHistory(workspaceId, budget.id, 30);
    if (history.length < 14) return null;

    // Tính std dev
    const amounts = history.map((h) => h.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    // Nếu ngày gần đây nằm ngoài 2 std dev thì bất thường
    const recentDays = amounts.slice(-3);
    const isAnomalous = recentDays.some(
      (amount) => Math.abs(amount - avg) > 2 * stdDev,
    );

    if (isAnomalous) {
      return {
        type: 'UNUSUAL_PATTERN',
        title: '🔄 Phát hiện pattern bất thường',
        description: 'Chi tiêu gần đây không theo pattern thường lệ',
        severity: 'MEDIUM',
        metricChange: 25,
        suggestedAction:
          'Xem xét lại chi tiêu và kiểm tra có giao dịch nào được ghi sai không',
      };
    }

    return null;
  }

  /**
   * Phát hiện category overspend
   */
  private async detectCategoryOverspend(
    workspaceId: string,
    budget: Budget,
  ): Promise<Anomaly | null> {
    const progress = await this.getBudgetProgress(workspaceId, budget);

    if (progress.percentageUsed > 100) {
      const overage = progress.percentageUsed - 100;
      return {
        type: 'CATEGORY_OVERSPEND',
        title: '📊 Vượt ngân sách',
        description: `Đã chi vượt ${overage.toFixed(1)}% so với dự định`,
        severity: overage > 30 ? 'CRITICAL' : overage > 15 ? 'HIGH' : 'MEDIUM',
        metricChange: overage,
        affectedCategories: budget.categoryId ? [budget.categoryId] : undefined,
        suggestedAction:
          'Cần cắt giảm chi tiêu hoặc tăng ngân sách cho hạng mục này',
      };
    }

    return null;
  }

  /**
   * Gợi ý chia ngân sách tự động
   */
  async suggestBudgetBreakdown(
    totalBudget: number,
    workspaceId?: string,
  ): Promise<Map<string, number>> {
    // Nếu có dữ liệu lịch sử workspace
    if (workspaceId) {
      const categories = await this.transactionsRepository
        .getRepository()
        .createQueryBuilder('t')
        .select('DISTINCT t.categoryId', 'categoryId')
        .where('t.workspaceId = :workspaceId', { workspaceId })
        .getRawMany();

      const categoryMap = new Map<string, number>();
      for (const cat of categories) {
        if (cat.categoryId) categoryMap.set(cat.categoryId, 0);
      }

      // Tính average spending per category
      const spendingByCategory = await this.getSpendingByCategory(
        workspaceId,
        90,
      ); // 3 tháng gần nhất
      return this.calculationService.suggestBudgetAllocation(
        totalBudget,
        Array.from(spendingByCategory.keys()),
        spendingByCategory,
      );
    }

    // Suggestion mặc định
    return this.calculationService.suggestBudgetAllocation(
      totalBudget,
      ['Marketing', 'Operations', 'HR', 'IT', 'Other'],
      undefined,
    );
  }

  // Helper methods

  private getPeriodDateRange(periodMonth: string): [Date, Date] {
    const date = new Date(periodMonth);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    return [start, end];
  }

  private async getSpendingHistory(
    workspaceId: string,
    budgetId: string,
    days: number,
  ): Promise<Array<{ date: Date; amount: number }>> {
    const budget = await this.budgetsRepository.findOne({ id: budgetId });
    if (!budget) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .select('DATE(t.occurredAt)', 'date')
      .addSelect('SUM(t.amountCents)', 'total')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.accountId = :accountId', { accountId: budget.accountId })
      .andWhere('t.occurredAt >= :start', { start: startDate })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .andWhere(budget.categoryId ? 't.categoryId = :categoryId' : '1=1', {
        categoryId: budget.categoryId,
      })
      .groupBy('DATE(t.occurredAt)')
      .orderBy('DATE(t.occurredAt)', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: new Date(r.date),
      amount: parseInt(r.total || 0),
    }));
  }

  private async getSpendingByCategory(
    workspaceId: string,
    days: number,
  ): Promise<Map<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amountCents)', 'total')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.occurredAt >= :start', { start: startDate })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .groupBy('t.categoryId')
      .getRawMany();

    const spending = new Map<string, number>();
    for (const row of result) {
      if (row.categoryId) {
        spending.set(row.categoryId, parseInt(row.total || 0));
      }
    }
    return spending;
  }

  private determineBudgetStatus(
    percentageUsed: number,
    threshold: number,
  ): 'ON_TRACK' | 'WARNING' | 'EXCEEDED' | 'CRITICAL' {
    if (percentageUsed > 100) {
      return percentageUsed > 110 ? 'CRITICAL' : 'EXCEEDED';
    }
    if (percentageUsed >= threshold) {
      return 'WARNING';
    }
    return 'ON_TRACK';
  }

  /**
   * Gợi ý tối ưu hóa ngân sách dựa trên chi tiêu thực tế
   */
  async suggestOptimization(workspaceId: string): Promise<any[]> {
    const { items: budgets } = await this.budgetsRepository.list(
      workspaceId,
      1,
      999,
    );
    const suggestions: any[] = [];

    for (const budget of budgets) {
      const progress = await this.getBudgetProgress(workspaceId, budget);

      // Nếu chi tiêu vượt 90% giới hạn, gợi ý giảm
      if (progress.percentageUsed > 90) {
        suggestions.push({
          budgetId: budget.id,
          categoryId: budget.categoryId,
          currentLimit: budget.amountLimitCents,
          recommendedLimit: Math.ceil(progress.spentCents * 1.1), // Increase to 110% of actual spend
          reason: `Chi tiêu đạt ${progress.percentageUsed.toFixed(1)}%, gợi ý tăng giới hạn`,
          potentialSavings: 0,
          priority: 'URGENT',
        });
      }

      // Nếu chi tiêu dưới 30% giới hạn, gợi ý giảm
      if (progress.percentageUsed < 30 && progress.spentCents > 0) {
        const reducedLimit = Math.ceil(progress.spentCents * 1.5); // Keep 50% buffer
        suggestions.push({
          budgetId: budget.id,
          categoryId: budget.categoryId,
          currentLimit: budget.amountLimitCents,
          recommendedLimit: reducedLimit,
          reason: `Chi tiêu chỉ ${progress.percentageUsed.toFixed(1)}%, có thể giảm giới hạn`,
          potentialSavings: budget.amountLimitCents - reducedLimit,
          priority: 'LOW',
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityMap = { URGENT: 0, MEDIUM: 1, LOW: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }
}
