import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../../billing/guards/feature.guard';
import { RequireFeatures } from '../../billing/guards/require-features.decorator';
import { FeatureCodes } from '../../billing/features/feature-codes';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { BudgetAnalyticsService } from './services/budget-analytics.service';
import { GoalAnalyticsService } from './services/goal-analytics.service';
import { InsightService } from './services/insight.service';
import { ActionSuggestionService } from './services/action-suggestion.service';
import { GamificationService } from './services/gamification.service';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import {
  BudgetProgressResponseDto,
  GoalProgressResponseDto,
  InsightResponseDto,
  AnomalyResponseDto,
  ActionSuggestionResponseDto,
  GamificationResponseDto,
  DashboardResponseDto,
} from './dto/analytics-response.dto';

/**
 * Analytics Controller
 * SOLID:
 * - Single Responsibility: Handle API requests
 * - Dependency Injection: Services injected
 * - Interface Segregation: Specific response DTOs
 */
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('personal/analytics')
export class AnalyticsController {
  constructor(
    private readonly budgetAnalytics: BudgetAnalyticsService,
    private readonly goalAnalytics: GoalAnalyticsService,
    private readonly insightService: InsightService,
    private readonly actionSuggestion: ActionSuggestionService,
    private readonly gamification: GamificationService,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  /**
   * GET /personal/analytics/dashboard
   * Lấy toàn bộ dashboard data
   */
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: any): Promise<DashboardResponseDto> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    // Parallelize data fetching
    const [
      budgets,
      goals,
      insights,
      anomalies,
      suggestions,
      gamificationStats,
    ] = await Promise.all([
      this.budgetAnalytics.analyzeBudgetProgress(workspaceId),
      this.goalAnalytics.analyzeGoalProgress(workspaceId),
      this.insightService.generateInsights(workspaceId),
      this.insightService.detectAnomalies(workspaceId),
      this.actionSuggestion.generateSmartSuggestions(workspaceId),
      this.gamification.getStats(workspaceId),
    ]);

    // Convert to response DTOs
    const budgetResponses = budgets.map(
      (b) => new BudgetProgressResponseDto(b),
    );
    const goalResponses = goals.map((g) => new GoalProgressResponseDto(g));
    const insightResponses = insights.map((i) => new InsightResponseDto(i));
    const anomalyResponses = anomalies.map((a) => new AnomalyResponseDto(a));
    const suggestionResponses = suggestions.map(
      (s) => new ActionSuggestionResponseDto(s),
    );
    const gamificationResponse = new GamificationResponseDto(gamificationStats);

    // Calculate summary - Ensure numeric conversion
    const totalBudget = budgets.reduce((sum, b) => {
      const limit = Number(b.limitCents);
      return sum + (isNaN(limit) ? 0 : limit);
    }, 0);
    const totalSpent = budgets.reduce((sum, b) => {
      const spent = Number(b.spentCents);
      return sum + (isNaN(spent) ? 0 : spent);
    }, 0);
    const buono = totalBudget - totalSpent;

    // Determine overall status
    const critericalBudgets = budgets.filter(
      (b) => b.status === 'CRITICAL',
    ).length;
    const exceededBudgets = budgets.filter(
      (b) => b.status === 'EXCEEDED',
    ).length;
    const warningBudgets = budgets.filter((b) => b.status === 'WARNING').length;

    let overallStatus: 'HEALTHY' | 'CAUTION' | 'CRITICAL' = 'HEALTHY';
    if (critericalBudgets > 0) overallStatus = 'CRITICAL';
    else if (exceededBudgets > 0) overallStatus = 'CAUTION';
    else if (warningBudgets > 0) overallStatus = 'CAUTION';

    const statusMessages: Record<string, string> = {
      HEALTHY: '✅ Tình hình tài chính bình thường',
      CAUTION: '⚠️ Cần chú ý đến chi tiêu',
      CRITICAL: '🚨 Tình hình rất nghiêm trọng, cần hành động ngay',
    };

    return {
      budgets: budgetResponses,
      goals: goalResponses,
      insights: insightResponses,
      anomalies: anomalyResponses,
      suggestions: suggestionResponses,
      gamification: gamificationResponse,
      summary: {
        totalBudget: `₫${totalBudget.toLocaleString('vi-VN')}`,
        totalSpent: `₫${totalSpent.toLocaleString('vi-VN')}`,
        buono: `₫${buono.toLocaleString('vi-VN')}`,
        overallStatus,
        statusMessage: statusMessages[overallStatus],
      },
    };
  }

  /**
   * GET /personal/analytics/budgets
   */
  /**
   * GET /personal/analytics/budgets
   * Phân tích tất cả budgets với summary
   */
  @Get('budgets')
  async getBudgetAnalysis(@CurrentUser() user: any): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const progress =
      await this.budgetAnalytics.analyzeBudgetProgress(workspaceId);

    // Thêm prediction cho mỗi budget
    const progressWithPredictions = await Promise.all(
      progress.map(async (p) => ({
        ...p,
        prediction: await this.budgetAnalytics.predictBudgetOverflow(
          workspaceId,
          p.budgetId,
        ),
      })),
    );

    const budgetResponses = progressWithPredictions.map(
      (p) => new BudgetProgressResponseDto(p),
    );

    // Tính summary statistics - Ensure numeric conversion
    const totalBudget = progress.reduce((sum, b) => {
      const limit = Number(b.limitCents);
      return sum + (isNaN(limit) ? 0 : limit);
    }, 0);

    const totalSpent = progress.reduce((sum, b) => {
      const spent = Number(b.spentCents);
      return sum + (isNaN(spent) ? 0 : spent);
    }, 0);

    const totalRemaining = totalBudget - totalSpent;
    const averageUtilization =
      progress.length > 0 ? totalSpent / totalBudget : 0;
    const budgetsOnTrack = progress.filter(
      (b) => b.status === 'ON_TRACK',
    ).length;
    const budgetsWarning = progress.filter(
      (b) => b.status === 'WARNING',
    ).length;
    const budgetsExceeded = progress.filter(
      (b) => b.status === 'EXCEEDED' || b.status === 'CRITICAL',
    ).length;

    return {
      totalBudgetCents: totalBudget,
      totalSpentCents: totalSpent,
      totalRemainingCents: totalRemaining,
      averageUtilization: (averageUtilization * 100).toFixed(2),
      budgetsOnTrack,
      budgetsWarning,
      budgetsExceeded,
      spendingTrend: 'STABLE', // TODO: Tính từ lịch sử
      trendPercentage: 0, // TODO: Tính từ so sánh tháng trước
      details: budgetResponses,
    };
  }

  /**
   * GET /personal/analytics/budgets/:id/prediction
   */
  @Get('budgets/:id/prediction')
  async getBudgetPrediction(
    @CurrentUser() user: any,
    @Param('id') budgetId: string,
  ): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const prediction = await this.budgetAnalytics.predictBudgetOverflow(
      workspaceId,
      budgetId,
    );
    return {
      budgetId,
      ...prediction,
    };
  }

  /**
   * GET /personal/analytics/goals
   */
  @Get('goals')
  async getGoalAnalysis(
    @CurrentUser() user: any,
  ): Promise<GoalProgressResponseDto[]> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const progress = await this.goalAnalytics.analyzeGoalProgress(workspaceId);
    return progress.map((g) => new GoalProgressResponseDto(g));
  }

  /**
   * GET /personal/analytics/insights
   */
  @Get('insights')
  async getInsights(@CurrentUser() user: any): Promise<InsightResponseDto[]> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const insights = await this.insightService.generateInsights(workspaceId);
    return insights.map((i) => new InsightResponseDto(i));
  }

  /**
   * GET /personal/analytics/anomalies
   */
  @Get('anomalies')
  async getAnomalies(@CurrentUser() user: any): Promise<AnomalyResponseDto[]> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const anomalies = await this.insightService.detectAnomalies(workspaceId);
    return anomalies.map((a) => new AnomalyResponseDto(a));
  }

  /**
   * GET /personal/analytics/suggestions
   */
  @Get('suggestions')
  async getSuggestions(
    @CurrentUser() user: any,
  ): Promise<ActionSuggestionResponseDto[]> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const suggestions =
      await this.actionSuggestion.generateSmartSuggestions(workspaceId);
    return suggestions.map((s) => new ActionSuggestionResponseDto(s));
  }

  /**
   * GET /personal/analytics/gamification
   */
  @Get('gamification')
  async getGamification(
    @CurrentUser() user: any,
  ): Promise<GamificationResponseDto> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const stats = await this.gamification.getStats(workspaceId);
    return new GamificationResponseDto(stats);
  }

  /**
   * POST /personal/analytics/budget-breakdown
   * Gợi ý chia ngân sách tự động
   */
  @Post('budget-breakdown')
  async suggestBudgetBreakdown(
    @CurrentUser() user: any,
    @Body() body: { totalBudget: number },
  ): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const breakdown = await this.budgetAnalytics.suggestBudgetBreakdown(
      body.totalBudget,
      workspaceId,
    );

    return {
      totalBudget: body.totalBudget,
      breakdown: Array.from(breakdown.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: ((amount / body.totalBudget) * 100).toFixed(1),
      })),
    };
  }

  /**
   * GET /personal/analytics/export
   * Export analytics data (CSV, PDF, etc.)
   */
  @Get('export')
  async exportAnalytics(@CurrentUser() user: any): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    const [budgets, goals, insights] = await Promise.all([
      this.budgetAnalytics.analyzeBudgetProgress(workspaceId),
      this.goalAnalytics.analyzeGoalProgress(workspaceId),
      this.insightService.generateInsights(workspaceId),
    ]);

    return {
      exportFile: 'analytics_export.json',
      data: {
        budgets,
        goals,
        insights,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * GET /personal/analytics/optimization
   * Gợi ý tối ưu hóa ngân sách
   */
  @Get('optimization')
  async getBudgetOptimization(@CurrentUser() user: any): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const suggestions =
      await this.budgetAnalytics.suggestOptimization(workspaceId);

    return {
      statusCode: 200,
      message: 'Success',
      workspaceId,
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        urgentCount: suggestions.filter((s) => s.priority === 'URGENT').length,
        potentialSavings: suggestions.reduce(
          (sum, s) => sum + s.potentialSavings,
          0,
        ),
      },
    };
  }

  /**
   * GET /personal/analytics/goal-strategy/:goalId
   * Gợi ý chiến lược để đạt goal nhanh hơn
   */
  @Get('goal-strategy/:goalId')
  async getGoalStrategy(
    @CurrentUser() user: any,
    @Param('goalId') goalId: string,
  ): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const suggestions = await this.goalAnalytics.suggestGoalStrategy(goalId);

    return {
      statusCode: 200,
      message: 'Success',
      goalId,
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        easyCount: suggestions.filter((s) => s.difficulty === 'EASY').length,
        hardCount: suggestions.filter((s) => s.difficulty === 'HARD').length,
      },
    };
  }
}
