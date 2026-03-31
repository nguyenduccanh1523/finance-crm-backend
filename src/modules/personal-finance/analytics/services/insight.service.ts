import { Injectable } from '@nestjs/common';
import {
  IInsightService,
  Insight,
  Anomaly,
} from '../interfaces/analytics.interface';
import { FinancialCalculationService } from './financial-calculation.service';
import { BudgetAnalyticsService } from './budget-analytics.service';
import { TransactionsRepository } from '../../transactions/transactions.repository';
import { BudgetsRepository } from '../../budgets/budgets.repository';
import { CategoriesRepository } from '../../categories/categories.repository';
import { v4 as uuidv4 } from 'uuid';

/**
 * Insight Service
 * SOLID:
 * - Single Responsibility: Chỉ generate insights, không lưu trữ
 * - Dependency Inversion: Implement IInsightService interface
 */
@Injectable()
export class InsightService implements IInsightService {
  constructor(
    private transactionsRepository: TransactionsRepository,
    private budgetsRepository: BudgetsRepository,
    private categoriesRepository: CategoriesRepository,
    private calculationService: FinancialCalculationService,
    private budgetAnalyticsService: BudgetAnalyticsService,
  ) {}

  /**
   * Generate tất cả insights
   */
  async generateInsights(workspaceId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Combine các loại insights
    const patternInsights = await this.generatePatternInsights(workspaceId);
    const warningInsights = await this.generateWarningInsights(workspaceId);

    insights.push(...patternInsights, ...warningInsights);

    return insights;
  }

  /**
   * Phát hiện bất thường (anomalies)
   */
  async detectAnomalies(workspaceId: string): Promise<Anomaly[]> {
    // Delegate to BudgetAnalyticsService
    return this.budgetAnalyticsService.detectBudgetAnomalies(workspaceId);
  }

  /**
   * Generate Pattern Insights
   * Ví dụ: "Chi tiêu tăng 18% so với tháng trước"
   */
  async generatePatternInsights(workspaceId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // 1. Chi tiêu tăng/giảm so với tháng trước
    const trendInsight = await this.generateTrendInsight(workspaceId);
    if (trendInsight) insights.push(trendInsight);

    // 2. Danh mục chi tiêu lớn nhất
    const topCategoryInsight =
      await this.generateTopCategoryInsight(workspaceId);
    if (topCategoryInsight) insights.push(topCategoryInsight);

    // 3. Chi tiêu bất thường
    const unusualCategoryInsight =
      await this.generateUnusualCategoryInsight(workspaceId);
    if (unusualCategoryInsight) insights.push(unusualCategoryInsight);

    // 4. Tiết kiệm thành công
    const savingsInsight = await this.generateSavingsInsight(workspaceId);
    if (savingsInsight) insights.push(savingsInsight);

    return insights;
  }

  /**
   * Generate Warning Insights
   * Ví dụ: "Nếu giữ tốc độ này, bạn sẽ vượt budget sau 10 ngày"
   */
  async generateWarningInsights(workspaceId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // 1. Cảnh báo vượt budget
    const overBudgetWarning = await this.generateOverBudgetWarning(workspaceId);
    if (overBudgetWarning) insights.push(overBudgetWarning);

    // 2. Cảnh báo danh mục sắp vượt
    const categoryWarnings = await this.generateCategoryWarnings(workspaceId);
    insights.push(...categoryWarnings);

    // 3. Cảnh báo goal sắp miss
    const goalWarnings = await this.generateGoalWarnings(workspaceId);
    insights.push(...goalWarnings);

    return insights;
  }

  // ============== Pattern Insights ==============

  private async generateTrendInsight(
    workspaceId: string,
  ): Promise<Insight | null> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);

    // Tìm chi tiêu tháng này
    const thisMonthSpent = await this.getSpentCents(
      workspaceId,
      thisMonthStart,
      new Date(),
    );

    // Tìm chi tiêu tháng trước
    const lastMonthSpent = await this.getSpentCents(
      workspaceId,
      lastMonthStart,
      lastMonthEnd,
    );

    if (lastMonthSpent === 0) return null;

    const trend = this.calculationService.calculatePercentageChange(
      lastMonthSpent,
      thisMonthSpent,
    );

    const insight: Insight = {
      id: uuidv4(),
      type: 'PATTERN',
      title: trend > 0 ? '📈 Chi tiêu tăng' : '📉 Chi tiêu giảm',
      description: `Bạn đang chi tiêu ${Math.abs(trend).toFixed(1)}% ${trend > 0 ? 'nhiều hơn' : 'ít hơn'} so với tháng trước`,
      metric: `${Math.abs(trend).toFixed(1)}% ${trend > 0 ? 'tăng' : 'giảm'}`,
      actionable: trend > 15,
      priority: trend > 30 ? 'HIGH' : trend > 15 ? 'MEDIUM' : 'LOW',
      timestamp: new Date(),
    };

    if (trend > 15) {
      insight.suggestedActions = [
        {
          id: uuidv4(),
          title: 'Kiểm tra chi tiêu chi tiết',
          description: 'Xem danh mục nào tăng nhiều nhất và cân nhắc cắt giảm',
          impact: 'POSITIVE',
          difficulty: 'EASY',
        },
      ];
    }

    return insight;
  }

  private async generateTopCategoryInsight(
    workspaceId: string,
  ): Promise<Insight | null> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const result = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(t.amountCents)', 'total')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.occurredAt >= :start', { start: thisMonthStart })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .andWhere('t.categoryId IS NOT NULL')
      .groupBy('t.categoryId')
      .orderBy('total', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result) return null;

    const category = await this.categoriesRepository.findOne({
      id: result.categoryId,
    });
    const categoryName = category?.name || 'Unknown';
    const totalSpent = parseInt(result.total || 0);
    const totalAllSpent = await this.getSpentCents(
      workspaceId,
      thisMonthStart,
      new Date(),
    );

    if (totalAllSpent === 0) return null;

    const percentage = (totalSpent / totalAllSpent) * 100;

    return {
      id: uuidv4(),
      type: 'PATTERN',
      title: '💰 Chi phí lớn nhất',
      description: `${categoryName} chiếm ${percentage.toFixed(1)}% tổng chi tiêu`,
      metric: `${percentage.toFixed(1)}% từ ${categoryName}`,
      actionable: percentage > 40,
      priority: percentage > 50 ? 'HIGH' : percentage > 40 ? 'MEDIUM' : 'LOW',
      timestamp: new Date(),
    };
  }

  private async generateUnusualCategoryInsight(
    workspaceId: string,
  ): Promise<Insight | null> {
    // Kiểm tra danh mục nào có spike gần đây
    const recentDays = 7;
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - recentDays);

    const olderStart = new Date(recentStart);
    olderStart.setDate(olderStart.getDate() - 7);

    const categories = await this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.type = :type', { type: 'EXPENSE' })
      .andWhere('t.categoryId IS NOT NULL')
      .groupBy('t.categoryId')
      .getRawMany();

    for (const cat of categories) {
      const recentSpent = await this.getSpentCents(
        workspaceId,
        recentStart,
        new Date(),
        cat.categoryId,
      );
      const olderSpent = await this.getSpentCents(
        workspaceId,
        olderStart,
        recentStart,
        cat.categoryId,
      );

      if (olderSpent > 0) {
        const change = this.calculationService.calculatePercentageChange(
          olderSpent,
          recentSpent,
        );
        if (change > 40) {
          const category = await this.categoriesRepository.findOne({
            id: cat.categoryId,
          });
          return {
            id: uuidv4(),
            type: 'PATTERN',
            title: '⚡ Danh mục tăng đột biến',
            description: `${category?.name} tăng ${change.toFixed(1)}% trong tuần qua`,
            metric: `${change.toFixed(1)}% tăng`,
            actionable: true,
            priority: change > 80 ? 'HIGH' : 'MEDIUM',
            timestamp: new Date(),
            suggestedActions: [
              {
                id: uuidv4(),
                title: 'Xem chi tiết giao dịch',
                description: 'Kiểm tra có giao dịch lớn hay bất thường không',
                impact: 'POSITIVE',
                difficulty: 'EASY',
              },
            ],
          };
        }
      }
    }

    return null;
  }

  private async generateSavingsInsight(
    workspaceId: string,
  ): Promise<Insight | null> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);

    const budgets = await this.budgetsRepository.list(workspaceId);
    let totalUnderBudget = 0;

    for (const budget of budgets) {
      const [periodStart, periodEnd] = this.getPeriodDateRange(
        budget.periodMonth,
      );
      const spent = await this.getSpentCents(
        workspaceId,
        periodStart,
        periodEnd,
        budget.categoryId,
      );

      if (spent < budget.amountLimitCents) {
        totalUnderBudget += budget.amountLimitCents - spent;
      }
    }

    if (totalUnderBudget > 0) {
      return {
        id: uuidv4(),
        type: 'ACHIEVEMENT',
        title: '🎉 Tiết kiệm thành công!',
        description: `Bạn đã tiết kiệm được ₫${totalUnderBudget.toLocaleString('vi-VN')}`,
        metric: `Tiết kiệm ₫${totalUnderBudget.toLocaleString('vi-VN')}`,
        actionable: false,
        priority: 'LOW',
        timestamp: new Date(),
      };
    }

    return null;
  }

  // ============== Warning Insights ==============

  private async generateOverBudgetWarning(
    workspaceId: string,
  ): Promise<Insight | null> {
    const budgets = await this.budgetsRepository.list(workspaceId);
    let overBudgetCount = 0;
    let totalOverage = 0;

    for (const budget of budgets) {
      const [periodStart, periodEnd] = this.getPeriodDateRange(
        budget.periodMonth,
      );
      const spent = await this.getSpentCents(
        workspaceId,
        periodStart,
        new Date(),
        budget.categoryId,
      );

      if (spent > budget.amountLimitCents) {
        overBudgetCount++;
        totalOverage += spent - budget.amountLimitCents;
      }
    }

    if (overBudgetCount > 0) {
      return {
        id: uuidv4(),
        type: 'WARNING',
        title: `⚠️ ${overBudgetCount} danh mục vượt budget`,
        description: `Tổng vượt ₫${totalOverage.toLocaleString('vi-VN')}`,
        metric: `Vượt ${overBudgetCount} danh mục`,
        actionable: true,
        priority: 'HIGH',
        timestamp: new Date(),
        suggestedActions: [
          {
            id: uuidv4(),
            title: 'Cắt giảm chi tiêu',
            description: 'Giảm chi phí trong các danh mục vượt budget',
            impact: 'POSITIVE',
            difficulty: 'MEDIUM',
            potentialSavingsCents: totalOverage,
          },
        ],
      };
    }

    return null;
  }

  private async generateCategoryWarnings(
    workspaceId: string,
  ): Promise<Insight[]> {
    const warnings: Insight[] = [];
    const budgets = await this.budgetsRepository.list(workspaceId);

    for (const budget of budgets) {
      const [periodStart, periodEnd] = this.getPeriodDateRange(
        budget.periodMonth,
      );
      const spent = await this.getSpentCents(
        workspaceId,
        periodStart,
        new Date(),
        budget.categoryId,
      );
      const percentageUsed = (spent / budget.amountLimitCents) * 100;

      if (percentageUsed >= 80 && percentageUsed < 100) {
        const category = budget.categoryId
          ? await this.categoriesRepository.findOne({
              id: budget.categoryId,
            })
          : null;

        warnings.push({
          id: uuidv4(),
          type: 'WARNING',
          title: `⚠️ ${category?.name || 'Danh mục'} sắp vượt budget`,
          description: `${percentageUsed.toFixed(1)}% ngân sách đã sử dụng`,
          metric: `${percentageUsed.toFixed(1)}%`,
          actionable: true,
          priority: 'MEDIUM',
          timestamp: new Date(),
          suggestedActions: [
            {
              id: uuidv4(),
              title: 'Giảm chi tiêu',
              description: `Cần giảm ₫${(budget.amountLimitCents - spent).toLocaleString('vi-VN')} để không vượt`,
              impact: 'POSITIVE',
              difficulty: 'MEDIUM',
              potentialSavingsCents: budget.amountLimitCents - spent,
            },
          ],
        });
      }
    }

    return warnings;
  }

  private async generateGoalWarnings(workspaceId: string): Promise<Insight[]> {
    // Implement goal warnings if needed
    return [];
  }

  // ============== Helper Methods ==============

  private async getSpentCents(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    categoryId?: string,
  ): Promise<number> {
    let query = this.transactionsRepository
      .getRepository()
      .createQueryBuilder('t')
      .select('SUM(t.amountCents)', 'total')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.occurredAt >= :start AND t.occurredAt <= :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('t.type = :type', { type: 'EXPENSE' });

    if (categoryId) {
      query = query.andWhere('t.categoryId = :categoryId', { categoryId });
    }

    const result = await query.getRawOne();
    return parseInt(result?.total || 0);
  }

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
}
