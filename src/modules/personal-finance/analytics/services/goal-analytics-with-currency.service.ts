import { Injectable } from '@nestjs/common';
import { GoalsRepository } from '../../goals/goals.repository';
import { ExchangeRateService } from '../../common/exchange-rate.service';
import { GoalAnalyticsService } from './goal-analytics.service';

/**
 * Goal Analytics with Multi-Currency Support
 *
 * Wrapper service cho GoalAnalyticsService
 * Handle: currency normalization, currency-based grouping, exchange rate conversion
 */
@Injectable()
export class GoalAnalyticsWithCurrencyService {
  constructor(
    private goalsRepository: GoalsRepository,
    private goalAnalyticsService: GoalAnalyticsService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Phân tích goals với multi-currency support
   *
   * Response structure:
   * {
   *   summaryByBaseCurrency: {
   *     baseCurrency: "VND",
   *     totalTargetCents: 500000000,
   *     totalCurrentCents: 250000000,
   *     currency_breakdowns: [...]
   *   }
   * }
   */
  async analyzeGoalsWithCurrency(workspaceId: string) {
    // Bước 1: Lấy tất cả goals (đã có currency từ entity)
    const { items: goals } = await this.goalsRepository.list(
      workspaceId,
      1,
      999,
    );

    // Bước 2: Lấy progress từ service cũ (single-currency logic)
    const goalProgresses =
      await this.goalAnalyticsService.analyzeGoalProgress(workspaceId);

    // Bước 3: Map progress với goals để lấy currency
    const goalsWithCurrency = goalProgresses.map((progress) => {
      const goal = goals.find((g) => g.id === progress.goalId);
      return {
        ...progress,
        currency: goal?.currency || 'VND',
        accountId: goal?.accountId,
      };
    });

    // Bước 4: Group by currency
    const currencyGroups = this.groupByCurrency(goalsWithCurrency);

    // Bước 5: Convert tất cả về base currency
    const summary = await this.createMultiCurrencySummary(
      workspaceId,
      currencyGroups,
    );

    return summary;
  }

  /**
   * Group goals by currency
   */
  private groupByCurrency(goals: any[]): Map<string, typeof goals> {
    const groups = new Map<string, typeof goals>();

    for (const goal of goals) {
      const currency = goal.currency || 'VND';
      if (!groups.has(currency)) {
        groups.set(currency, []);
      }
      groups.get(currency)!.push(goal);
    }

    return groups;
  }

  /**
   * Tạo summary với conversion về base currency
   */
  private async createMultiCurrencySummary(
    workspaceId: string,
    currencyGroups: Map<string, any[]>,
  ) {
    let totalTargetInBaseCurrency = 0;
    let totalCurrentInBaseCurrency = 0;
    let totalRemainingInBaseCurrency = 0;

    const currencyBreakdowns: Array<{
      currency: string;
      totalTargetCents: number;
      totalCurrentCents: number;
      totalRemainingCents: number;
      percentageComplete: number;
      convertedToBaseCurrency: {
        totalTargetCents: number;
        totalCurrentCents: number;
        totalRemainingCents: number;
      };
      goals: any[];
    }> = [];

    // Iterate qua mỗi currency group
    for (const [currency, goals] of currencyGroups) {
      // Tính tổng cho currency này
      const totalTargetInCurrency = goals.reduce(
        (sum, g) => sum + g.targetAmountCents,
        0,
      );
      const totalCurrentInCurrency = goals.reduce(
        (sum, g) => sum + g.currentAmountCents,
        0,
      );
      const totalRemainingInCurrency = goals.reduce(
        (sum, g) => sum + (g.targetAmountCents - g.currentAmountCents),
        0,
      );

      // Convert về base currency
      const totalTargetInBase =
        await this.exchangeRateService.convertToBaseCurrency(
          totalTargetInCurrency,
          currency,
          workspaceId,
        );
      const totalCurrentInBase =
        await this.exchangeRateService.convertToBaseCurrency(
          totalCurrentInCurrency,
          currency,
          workspaceId,
        );
      const totalRemainingInBase =
        await this.exchangeRateService.convertToBaseCurrency(
          totalRemainingInCurrency,
          currency,
          workspaceId,
        );

      // Cập nhật totals
      totalTargetInBaseCurrency += totalTargetInBase;
      totalCurrentInBaseCurrency += totalCurrentInBase;
      totalRemainingInBaseCurrency += totalRemainingInBase;

      // Tạo breakdown cho currency này
      currencyBreakdowns.push({
        currency,
        totalTargetCents: totalTargetInCurrency,
        totalCurrentCents: totalCurrentInCurrency,
        totalRemainingCents: totalRemainingInCurrency,
        percentageComplete:
          (totalCurrentInCurrency / totalTargetInCurrency) * 100,
        convertedToBaseCurrency: {
          totalTargetCents: totalTargetInBase,
          totalCurrentCents: totalCurrentInBase,
          totalRemainingCents: totalRemainingInBase,
        },
        goals: goals.map((g) => ({
          goalId: g.goalId,
          name: g.name,
          targetAmountCents: g.targetAmountCents,
          currentAmountCents: g.currentAmountCents,
          remainingCents: g.targetAmountCents - g.currentAmountCents,
          percentageComplete:
            (g.currentAmountCents / g.targetAmountCents) * 100,
          status: g.status,
          estimatedCompletionDate: g.estimatedCompletionDate,
          velocity: g.velocityPerDay,
          currency,
        })),
      });
    }

    return {
      statusCode: 200,
      message: 'Success',
      data: {
        summaryByBaseCurrency: {
          baseCurrency: 'VND', // TODO: Lấy từ workspace config
          totalTargetCents: Math.round(totalTargetInBaseCurrency),
          totalCurrentCents: Math.round(totalCurrentInBaseCurrency),
          totalRemainingCents: Math.round(totalRemainingInBaseCurrency),
          percentageComplete:
            (totalCurrentInBaseCurrency / totalTargetInBaseCurrency) * 100,
        },
        detailsByCurrency: currencyBreakdowns,
      },
    };
  }

  /**
   * Lấy goal progress cho một account (single currency)
   */
  async getGoalProgressForAccount(workspaceId: string, accountId: string) {
    const { items: goals } = await this.goalsRepository.list(
      workspaceId,
      1,
      999,
    );
    const accountGoals = goals.filter((g) => g.accountId === accountId);

    if (accountGoals.length === 0) {
      return {
        statusCode: 200,
        message: 'Success',
        data: {
          accountId,
          currency: accountGoals[0]?.currency || 'VND',
          totalTargetCents: 0,
          totalCurrentCents: 0,
          totalRemainingCents: 0,
          goals: [],
        },
      };
    }

    // Lấy progress cho tất cả goals
    const goalProgresses =
      await this.goalAnalyticsService.analyzeGoalProgress(workspaceId);

    // Filter chỉ cái của account này
    const accountProgresses = goalProgresses.filter((p) => {
      const goal = accountGoals.find((g) => g.id === p.goalId);
      return !!goal;
    });

    // Tính tổng
    const totalTargetCents = accountProgresses.reduce(
      (sum, p) => sum + p.targetAmountCents,
      0,
    );
    const totalCurrentCents = accountProgresses.reduce(
      (sum, p) => sum + p.currentAmountCents,
      0,
    );
    const totalRemainingCents = totalTargetCents - totalCurrentCents;

    return {
      statusCode: 200,
      message: 'Success',
      data: {
        accountId,
        currency: accountGoals[0]?.currency || 'VND',
        totalTargetCents,
        totalCurrentCents,
        totalRemainingCents,
        percentageComplete: (totalCurrentCents / totalTargetCents) * 100,
        goals: accountProgresses.map((p) => ({
          goalId: p.goalId,
          name: p.name,
          targetAmountCents: p.targetAmountCents,
          currentAmountCents: p.currentAmountCents,
          remainingCents: p.targetAmountCents - p.currentAmountCents,
          percentageComplete:
            (p.currentAmountCents / p.targetAmountCents) * 100,
          status: p.status,
          estimatedCompletionDate: p.estimatedCompletionDate,
          velocity: p.velocityPerDay,
        })),
      },
    };
  }
}
