import { Injectable } from '@nestjs/common';
import { IFinancialCalculationService } from '../interfaces/analytics.interface';

/**
 * Financial Calculation Service
 * SOLID - Single Responsibility: Chỉ handle các calculation
 * Dependency Injection: Không phụ thuộc vào database
 */
@Injectable()
export class FinancialCalculationService implements IFinancialCalculationService {
  /**
   * Tính trend hàng tháng (% thay đổi)
   * Ví dụ: từ 10M tháng trước -> 12M tháng này = +20%
   */
  calculateMonthlyTrend(data: Array<{ date: Date; amount: number }>): number {
    if (data.length < 2) return 0;

    const sortedData = [...data].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    const previous = sortedData[0].amount;
    const current = sortedData[sortedData.length - 1].amount;

    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Tính phân bố theo danh mục
   * Ví dụ: {Marketing: 45%, Ads: 35%, Other: 20%}
   */
  async calculateCategoryDistribution(
    spendingByCategory: Map<string, number>,
  ): Promise<Map<string, number>> {
    const total = Array.from(spendingByCategory.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    if (total === 0) return spendingByCategory;

    const distribution = new Map<string, number>();
    for (const [category, amount] of spendingByCategory.entries()) {
      distribution.set(category, (amount / total) * 100);
    }
    return distribution;
  }

  /**
   * Dự báo cuối tháng
   * Công thức: (chi tiêu hiện tại / ngày đã trôi) * tổng ngày trong tháng
   */
  forecastMonthEnd(
    currentSpent: number,
    daysElapsed: number,
    daysInMonth: number = 30,
  ): number {
    if (daysElapsed === 0) return 0;
    return (currentSpent / daysElapsed) * daysInMonth;
  }

  /**
   * So sánh Budget vs Actual
   * Trả về variance (budget - actual)
   */
  calculateBudgetVsActual(
    limits: Map<string, number>,
    actuals: Map<string, number>,
  ): Map<string, number> {
    const variance = new Map<string, number>();

    for (const [category, limit] of limits.entries()) {
      const actual = actuals.get(category) || 0;
      variance.set(category, limit - actual);
    }

    return variance;
  }

  /**
   * Tính số ngày còn lại trong tháng
   */
  getDaysLeftInMonth(date: Date = new Date()): number {
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.ceil(
      (lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  /**
   * Tính tốc độ đạt mục tiêu (per ngày)
   */
  calculateDailyVelocity(totalAchieved: number, daysSpent: number): number {
    if (daysSpent === 0) return 0;
    return totalAchieved / daysSpent;
  }

  /**
   * Dự báo ngày hoàn thành dựa trên tốc độ hiện tại
   */
  estimateCompletionDate(
    targetAmount: number,
    currentAmount: number,
    dailyVelocity: number,
  ): Date {
    if (dailyVelocity <= 0) return new Date(8640000000000000); // Far future date

    const daysNeeded = (targetAmount - currentAmount) / dailyVelocity;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + Math.ceil(daysNeeded));
    return completionDate;
  }

  /**
   * Kiểm tra xem có ahead schedule không
   */
  isAheadSchedule(targetDate: Date, estimatedCompletionDate: Date): boolean {
    return estimatedCompletionDate < targetDate;
  }

  /**
   * Tính số ngày ahead schedule
   */
  calculateDaysAheadSchedule(
    targetDate: Date,
    estimatedCompletionDate: Date,
  ): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor(
      (targetDate.getTime() - estimatedCompletionDate.getTime()) / msPerDay,
    );
  }

  /**
   * Phân loại ngân sách tự động
   * Ví dụ: 100M budget -> Marketing 40%, Ops 35%, HR 25%
   * Sử dụng tiêu chuẩn industry hoặc dữ liệu lịch sử
   */
  async suggestBudgetAllocation(
    totalBudget: number,
    categories: string[],
    historicalData?: Map<string, number>,
  ): Promise<Map<string, number>> {
    const allocation = new Map<string, number>();

    // Nếu có dữ liệu lịch sử, dùng tỷ lệ từ đó
    if (historicalData && historicalData.size > 0) {
      const distribution =
        await this.calculateCategoryDistribution(historicalData);
      for (const [category, percentage] of distribution) {
        allocation.set(category, (totalBudget * percentage) / 100);
      }
      return allocation;
    }

    // Fallback: chia đều hoặc dùng SMART allocation
    // SMART allocation: một số danh mục được ưu tiên cao hơn
    const suggestions: Record<string, number> = {
      Marketing: 0.35,
      Operations: 0.35,
      HR: 0.15,
      IT: 0.1,
      Other: 0.05,
    };

    for (const category of categories) {
      const percentage = suggestions[category] || 1 / categories.length;
      allocation.set(category, totalBudget * percentage);
    }

    return allocation;
  }

  /**
   * Dự báo vượt budget và số ngày
   */
  calculateDaysUntilBudgetOverflow(
    currentSpent: number,
    budgetLimit: number,
    dailySpendingRate: number,
  ): number | null {
    if (dailySpendingRate <= 0) return null;

    const remainingBudget = budgetLimit - currentSpent;
    if (remainingBudget <= 0) return 0; // Đã vượt rồi

    return Math.ceil(remainingBudget / dailySpendingRate);
  }

  /**
   * Tính average spending per category
   */
  calculateAverageByCategory(
    spendingHistory: Array<{ category: string; amount: number; date: Date }>,
  ): Map<string, number> {
    const categoryTotals = new Map<string, { total: number; count: number }>();

    for (const record of spendingHistory) {
      const existing = categoryTotals.get(record.category) || {
        total: 0,
        count: 0,
      };
      categoryTotals.set(record.category, {
        total: existing.total + record.amount,
        count: existing.count + 1,
      });
    }

    const averages = new Map<string, number>();
    for (const [category, data] of categoryTotals) {
      averages.set(category, data.total / data.count);
    }

    return averages;
  }

  /**
   * Detect spending spike so với baseline
   */
  detectSpendingSpike(
    currentAmount: number,
    baseline: number,
    threshold: number = 1.3,
  ): boolean {
    if (baseline === 0) return false;
    return currentAmount / baseline > threshold;
  }

  /**
   * Tính % thay đổi
   */
  calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Confidence score cho prediction (0-100)
   * Dựa vào số lượng data points
   */
  calculateConfidenceScore(
    dataPoints: number,
    minDataPoints: number = 7,
  ): number {
    const confidence = (dataPoints / minDataPoints) * 100;
    return Math.min(confidence, 100);
  }
}
