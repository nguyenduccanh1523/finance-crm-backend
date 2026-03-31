import { Injectable } from '@nestjs/common';
import {
  IActionSuggestionService,
  ActionSuggestion,
} from '../interfaces/analytics.interface';
import { FinancialCalculationService } from './financial-calculation.service';
import { BudgetAnalyticsService } from './budget-analytics.service';
import { BudgetsRepository } from '../../budgets/budgets.repository';
import { CategoriesRepository } from '../../categories/categories.repository';
import { v4 as uuidv4 } from 'uuid';

/**
 * Action Suggestion Service
 * SOLID:
 * - Single Responsibility: Chỉ generate suggestions
 * - Dependency Injection: Inject required services
 * Cái này là "productivity engine" - giúp user hành động ngay
 */
@Injectable()
export class ActionSuggestionService implements IActionSuggestionService {
  constructor(
    private budgetsRepository: BudgetsRepository,
    private categoriesRepository: CategoriesRepository,
    private calculationService: FinancialCalculationService,
    private budgetAnalyticsService: BudgetAnalyticsService,
  ) {}

  /**
   * Gợi ý tối ưu ngân sách
   * Ví dụ: "Giảm chi Ads 15% để giữ budget"
   */
  async suggestBudgetOptimization(
    workspaceId: string,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // Phân tích các budgets vượt hoặc sắp vượt
    const progress =
      await this.budgetAnalyticsService.analyzeBudgetProgress(workspaceId);

    for (const prog of progress) {
      if (prog.status === 'EXCEEDED' || prog.status === 'CRITICAL') {
        const overageAmount = prog.spentCents - prog.limitCents;
        const reductionPercentage = (overageAmount / prog.limitCents) * 100;

        const categoryName = prog.categoryName || 'danh mục';

        suggestions.push({
          id: uuidv4(),
          title: `Giảm chi ${categoryName} ${Math.ceil(reductionPercentage)}%`,
          description: `Cần giảm ₫${overageAmount.toLocaleString('vi-VN')} để giữ ngân sách`,
          impact: 'POSITIVE',
          estimatedResult: `Tiết kiệm ₫${overageAmount.toLocaleString('vi-VN')}`,
          difficulty: 'MEDIUM',
          category: categoryName,
          potentialSavingsCents: overageAmount,
        });
      } else if (prog.status === 'WARNING') {
        const warningThreshold = (prog.limitCents * prog.percentageUsed) / 100;
        const remainingBudget = prog.limitCents - prog.spentCents;

        suggestions.push({
          id: uuidv4(),
          title: `Tăng tốc độ kiểm soát ${prog.categoryName || 'danh mục'}`,
          description: `Còn ₫${remainingBudget.toLocaleString('vi-VN')} cho tháng này`,
          impact: 'NEUTRAL',
          estimatedResult: `Dự phòng ₫${remainingBudget.toLocaleString('vi-VN')}`,
          difficulty: 'EASY',
          category: prog.categoryName,
        });
      }
    }

    return suggestions;
  }

  /**
   * Gợi ý chiến lược cho mục tiêu
   * Ví dụ: "Tăng giá 5% hoặc giảm chi phí vận hành 10%"
   */
  async suggestGoalStrategy(goalId: string): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // Ví dụ suggestion: nếu goal là profit
    suggestions.push({
      id: uuidv4(),
      title: 'Tăng giá bán 5%',
      description: 'Tăng giá sản phẩm/dịch vụ nhẹ để tăng doanh thu',
      impact: 'POSITIVE',
      estimatedResult: 'Tăng doanh thu ~5%',
      difficulty: 'MEDIUM',
      potentialRevenueIncCents: 50000000, // 500k (example)
    });

    suggestions.push({
      id: uuidv4(),
      title: 'Giảm chi phí vận hành 10%',
      description: 'Tối ưu hóa quy trình để giảm chi phí',
      impact: 'POSITIVE',
      estimatedResult: 'Tiết kiệm ~10% chi phí',
      difficulty: 'HARD',
      potentialSavingsCents: 100000000, // 1M (example)
    });

    suggestions.push({
      id: uuidv4(),
      title: 'Tăng khối lượng bán 15%',
      description: 'Tập trung marketing & sales để bán nhiều hơn',
      impact: 'POSITIVE',
      estimatedResult: 'Tăng doanh thu ~15%',
      difficulty: 'HARD',
      potentialRevenueIncCents: 150000000, // 1.5M (example)
    });

    return suggestions;
  }

  /**
   * Gợi ý cắt giảm chi phí theo danh mục
   * Ví dụ: "Giảm Ads 15% để tiết kiệm 1.5M"
   */
  async suggestSpendingReduction(
    categoryId: string,
    targetReduction: number,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];
    const category = await this.categoriesRepository.findOne({
      id: categoryId,
    });
    const categoryName = category?.name || 'danh mục';

    // Strategy 1: Giảm khối lượng
    suggestions.push({
      id: uuidv4(),
      title: `Giảm khối lượng ${categoryName}`,
      description: `Cắt giảm ${Math.round(targetReduction / 2)}% khối lượng chi tiêu`,
      impact: 'POSITIVE',
      estimatedResult: `Tiết kiệm ₫${targetReduction.toLocaleString('vi-VN')}`,
      difficulty: 'MEDIUM',
      category: categoryName,
      potentialSavingsCents: targetReduction,
    });

    // Strategy 2: Thương lượng giá
    suggestions.push({
      id: uuidv4(),
      title: `Thương lượng giá với nhà cung cấp`,
      description: `Yêu cầu chiết khấu hoặc giá tốt hơn`,
      impact: 'POSITIVE',
      estimatedResult: `Tiết kiệm ₫${(targetReduction * 0.8).toLocaleString('vi-VN')}`,
      difficulty: 'MEDIUM',
      category: categoryName,
      potentialSavingsCents: Math.round(targetReduction * 0.8),
    });

    // Strategy 3: Tìm giải pháp thay thế
    suggestions.push({
      id: uuidv4(),
      title: `Tìm nhà cung cấp rẻ hơn`,
      description: `So sánh giá với các nhà cung cấp khác`,
      impact: 'POSITIVE',
      estimatedResult: `Tiết kiệm ₫${(targetReduction * 0.6).toLocaleString('vi-VN')}`,
      difficulty: 'HARD',
      category: categoryName,
      potentialSavingsCents: Math.round(targetReduction * 0.6),
    });

    return suggestions;
  }

  /**
   * Gợi ý tăng doanh thu
   */
  async suggestRevenueIncrease(
    currentRevenue: number,
    targetRevenue: number,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];
    const revenueGap = Math.max(0, targetRevenue - currentRevenue);

    suggestions.push({
      id: uuidv4(),
      title: 'Tăng khối lượng bán hàng',
      description:
        'Tập trung vào marketing và bán hàng để tăng số lượng khách hàng',
      impact: 'POSITIVE',
      estimatedResult: `Cần tăng doanh thu ₫${revenueGap.toLocaleString('vi-VN')}`,
      difficulty: 'HARD',
      potentialRevenueIncCents: revenueGap,
    });

    suggestions.push({
      id: uuidv4(),
      title: 'Tăng giá sản phẩm/dịch vụ',
      description: 'Điều chỉnh giá để tăng giá trị mỗi giao dịch',
      impact: 'POSITIVE',
      estimatedResult: 'Tăng doanh thu ~5-10%',
      difficulty: 'MEDIUM',
      potentialRevenueIncCents: Math.round(currentRevenue * 0.075),
    });

    suggestions.push({
      id: uuidv4(),
      title: 'Up-sell / Cross-sell',
      description: 'Bán thêm sản phẩm/dịch vụ bổ sung cho khách hàng hiện tại',
      impact: 'POSITIVE',
      estimatedResult: 'Tăng doanh thu ~3-7%',
      difficulty: 'MEDIUM',
      potentialRevenueIncCents: Math.round(currentRevenue * 0.05),
    });

    suggestions.push({
      id: uuidv4(),
      title: 'Tìm khách hàng mới',
      description: 'Mở rộng sang thị trường/segment khách hàng mới',
      impact: 'POSITIVE',
      estimatedResult: 'Tăng doanh thu ~10-20%',
      difficulty: 'HARD',
      potentialRevenueIncCents: Math.round(currentRevenue * 0.15),
    });

    return suggestions;
  }

  /**
   * Smart suggestions dựa vào toàn bộ tình hình tài chính
   */
  async generateSmartSuggestions(
    workspaceId: string,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // 1. Budget optimization
    const budgetSuggestions = await this.suggestBudgetOptimization(workspaceId);
    suggestions.push(...budgetSuggestions.slice(0, 2)); // Lấy top 2

    // 2. Quick wins (dễ làm, hiệu quả cao)
    const quickWins = await this.generateQuickWins(workspaceId);
    suggestions.push(...quickWins);

    // 3. Long-term strategies
    const strategies = await this.generateLongTermStrategies(workspaceId);
    suggestions.push(...strategies);

    // Sort by impact + difficulty
    suggestions.sort((a, b) => {
      const scoreA = this.calculateActionScore(a);
      const scoreB = this.calculateActionScore(b);
      return scoreB - scoreA;
    });

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  // ============== Helper Methods ==============

  private async generateQuickWins(
    workspaceId: string,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // Example quick wins
    suggestions.push({
      id: uuidv4(),
      title: '🚀 Bật thông báo ngân sách',
      description: 'Nhận cảnh báo khi sắp vượt budget',
      impact: 'NEUTRAL',
      difficulty: 'EASY',
    });

    suggestions.push({
      id: uuidv4(),
      title: '🚀 Đánh giá lại subscriptions',
      description: 'Kiểm tra các dịch vụ subscription không cần thiết',
      impact: 'POSITIVE',
      difficulty: 'EASY',
      estimatedResult: 'Có thể tiết kiệm 10-30%',
    });

    return suggestions;
  }

  private async generateLongTermStrategies(
    workspaceId: string,
  ): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    suggestions.push({
      id: uuidv4(),
      title: '📊 Xây dựng hệ thống tracking chi tiết',
      description:
        'Theo dõi chi tiêu theo project/công việc để tối ưu hóa tốt hơn',
      impact: 'POSITIVE',
      difficulty: 'MEDIUM',
      estimatedResult: 'Cải thiện kiểm soát chi phí 20-30%',
    });

    suggestions.push({
      id: uuidv4(),
      title: '💼 Review quy trình mua hàng',
      description: 'Tới tâm hóa quy trình approval để tiết kiệm',
      impact: 'POSITIVE',
      difficulty: 'HARD',
      estimatedResult: 'Tiết kiệm 5-15% chi phí',
    });

    return suggestions;
  }

  private calculateActionScore(action: ActionSuggestion): number {
    let score = 0;

    // Impact score
    if (action.impact === 'POSITIVE') score += 100;
    if (action.impact === 'NEUTRAL') score += 50;

    // Difficulty penalty (dễ hơn = điểm cao hơn)
    if (action.difficulty === 'EASY') score += 50;
    if (action.difficulty === 'MEDIUM') score += 25;
    if (action.difficulty === 'HARD') score += 10;

    // Potential savings/revenue
    if (action.potentialSavingsCents)
      score += action.potentialSavingsCents / 100000; // Normalize
    if (action.potentialRevenueIncCents)
      score += action.potentialRevenueIncCents / 100000;

    return score;
  }
}
