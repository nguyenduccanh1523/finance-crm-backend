import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from '../../budgets/budgets.repository';
import { ExchangeRateService } from '../../common/exchange-rate.service';
import { BudgetAnalyticsService } from './budget-analytics.service';

/**
 * Budget Analytics with Multi-Currency Support
 *
 * Wrapper service cho BudgetAnalyticsService
 * Handle: currency normalization, currency-based grouping, exchange rate conversion
 */
@Injectable()
export class BudgetAnalyticsWithCurrencyService {
  constructor(
    private budgetsRepository: BudgetsRepository,
    private budgetAnalyticsService: BudgetAnalyticsService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Phân tích budgets với multi-currency support
   *
   * Response structure:
   * {
   *   summaryByBaseCurrency: {
   *     baseCurrency: "VND",
   *     totalBudgetCents: 491250000,
   *     totalSpentCents: 0,
   *     currency_breakdowns: [...]
   *   }
   * }
   */
  async analyzeBudgetsWithCurrency(workspaceId: string) {
    // Bước 1: Lấy tất cả budgets (đã có currency từ entity)
    const { items: budgets } = await this.budgetsRepository.list(
      workspaceId,
      1,
      999,
    );

    // Bước 2: Lấy progress từ service cũ (single-currency logic)
    const budgetProgresses =
      await this.budgetAnalyticsService.analyzeBudgetProgress(workspaceId);

    // Bước 3: Map progress với budgets để lấy currency
    const budgetsWithCurrency = budgetProgresses.map((progress) => {
      const budget = budgets.find((b) => b.id === progress.budgetId);
      return {
        ...progress,
        currency: budget?.currency || 'VND',
        accountId: budget?.accountId,
      };
    });

    // Bước 4: Group by currency
    const currencyGroups = this.groupByCurrency(budgetsWithCurrency);

    // Bước 5: Convert tất cả về base currency
    const summary = await this.createMultiCurrencySummary(
      workspaceId,
      currencyGroups,
    );

    return summary;
  }

  /**
   * Group budgets by currency
   */
  private groupByCurrency(budgets: any[]): Map<string, typeof budgets> {
    const groups = new Map<string, typeof budgets>();

    for (const budget of budgets) {
      const currency = budget.currency || 'VND';
      if (!groups.has(currency)) {
        groups.set(currency, []);
      }
      groups.get(currency)!.push(budget);
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
    let totalBudgetInBaseCurrency = 0;
    let totalSpentInBaseCurrency = 0;
    let totalRemainingInBaseCurrency = 0;

    const currencyBreakdowns: Array<{
      currency: string;
      totalBudgetCents: number;
      totalSpentCents: number;
      totalRemainingCents: number;
      percentageUsed: number;
      convertedToBaseCurrency: {
        totalBudgetCents: number;
        totalSpentCents: number;
        totalRemainingCents: number;
      };
      budgets: any[];
    }> = [];

    // Iterate qua mỗi currency group
    for (const [currency, budgets] of currencyGroups) {
      // Tính tổng cho currency này
      const totalBudgetInCurrency = budgets.reduce(
        (sum, b) => sum + b.limitCents,
        0,
      );
      const totalSpentInCurrency = budgets.reduce(
        (sum, b) => sum + b.spentCents,
        0,
      );
      const totalRemainingInCurrency = budgets.reduce(
        (sum, b) => sum + b.remainingCents,
        0,
      );

      // Convert về base currency
      const totalBudgetInBase =
        await this.exchangeRateService.convertToBaseCurrency(
          totalBudgetInCurrency,
          currency,
          workspaceId,
        );
      const totalSpentInBase =
        await this.exchangeRateService.convertToBaseCurrency(
          totalSpentInCurrency,
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
      totalBudgetInBaseCurrency += totalBudgetInBase;
      totalSpentInBaseCurrency += totalSpentInBase;
      totalRemainingInBaseCurrency += totalRemainingInBase;

      // Tạo breakdown cho currency này
      currencyBreakdowns.push({
        currency,
        totalBudgetCents: totalBudgetInCurrency,
        totalSpentCents: totalSpentInCurrency,
        totalRemainingCents: totalRemainingInCurrency,
        percentageUsed: (totalSpentInCurrency / totalBudgetInCurrency) * 100,
        convertedToBaseCurrency: {
          totalBudgetCents: totalBudgetInBase,
          totalSpentCents: totalSpentInBase,
          totalRemainingCents: totalRemainingInBase,
        },
        budgets: budgets.map((b) => ({
          budgetId: b.budgetId,
          categoryName: b.categoryName,
          limitCents: b.limitCents,
          spentCents: b.spentCents,
          remainingCents: b.remainingCents,
          percentageUsed: b.percentageUsed,
          status: b.status,
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
          totalBudgetCents: Math.round(totalBudgetInBaseCurrency),
          totalSpentCents: Math.round(totalSpentInBaseCurrency),
          totalRemainingCents: Math.round(totalRemainingInBaseCurrency),
          percentageUsed:
            (totalSpentInBaseCurrency / totalBudgetInBaseCurrency) * 100,
        },
        detailsByCurrency: currencyBreakdowns,
      },
    };
  }

  /**
   * Lấy budget progress cho một account (single currency)
   */
  async getBudgetProgressForAccount(workspaceId: string, accountId: string) {
    const { items: budgets } = await this.budgetsRepository.list(
      workspaceId,
      1,
      999,
    );
    const accountBudgets = budgets.filter((b) => b.accountId === accountId);

    if (accountBudgets.length === 0) {
      return {
        statusCode: 200,
        message: 'Success',
        data: {
          accountId,
          currency: accountBudgets[0]?.currency || 'VND',
          totalBudgetCents: 0,
          totalSpentCents: 0,
          totalRemainingCents: 0,
          budgets: [],
        },
      };
    }

    // Lấy progress cho tất cả budgets
    const budgetProgresses =
      await this.budgetAnalyticsService.analyzeBudgetProgress(workspaceId);

    // Filter chỉ cái của account này
    const accountProgresses = budgetProgresses.filter((p) => {
      const budget = accountBudgets.find((b) => b.id === p.budgetId);
      return !!budget;
    });

    // Tính tổng
    const totalBudgetCents = accountProgresses.reduce(
      (sum, p) => sum + p.limitCents,
      0,
    );
    const totalSpentCents = accountProgresses.reduce(
      (sum, p) => sum + p.spentCents,
      0,
    );
    const totalRemainingCents = accountProgresses.reduce(
      (sum, p) => sum + p.remainingCents,
      0,
    );

    return {
      statusCode: 200,
      message: 'Success',
      data: {
        accountId,
        currency: accountBudgets[0]?.currency || 'VND',
        totalBudgetCents,
        totalSpentCents,
        totalRemainingCents,
        percentageUsed: (totalSpentCents / totalBudgetCents) * 100,
        budgets: accountProgresses.map((p) => ({
          budgetId: p.budgetId,
          categoryName: p.categoryName,
          limitCents: p.limitCents,
          spentCents: p.spentCents,
          remainingCents: p.remainingCents,
          percentageUsed: p.percentageUsed,
          status: p.status,
        })),
      },
    };
  }
}
