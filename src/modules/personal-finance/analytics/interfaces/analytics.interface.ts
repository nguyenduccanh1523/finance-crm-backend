/**
 * SOLID Interfaces cho Analytics Module
 * Separation of Concerns: Mỗi interface có trách nhiệm riêng biệt
 */

/** Dữ liệu dự đoán ngân sách */
export interface BudgetPrediction {
  predictedSpendCents: number;
  overagePercentage: number;
  isOverBudget: boolean;
  daysUntilOverBudget?: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  confidence: number; // 0-100
}

/** Thông tin tiến độ ngân sách chi tiết */
export interface BudgetProgress {
  budgetId: string;
  categoryId?: string;
  categoryName?: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED' | 'CRITICAL';
  daysLeftInMonth: number;
}

/** Thông tin tiến độ mục tiêu */
export interface GoalProgress {
  goalId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  percentageAchieved: number;
  amountNeededCents: number;
  daysLeft: number;
  velocityPerDay: number; // số tiền đạt được per ngày
  isAheadSchedule: boolean;
  daysAheadSchedule?: number;
  estimatedCompletionDate: Date;
  status: 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'COMPLETED';
}

/** Insight phát hiện bất thường */
export interface Anomaly {
  type: 'SPENDING_SPIKE' | 'UNUSUAL_PATTERN' | 'CATEGORY_OVERSPEND';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metricChange: number; // % thay đổi so với baseline
  suggestedAction?: string;
  affectedCategories?: string[];
}

/** Insight chung */
export interface Insight {
  id: string;
  type: 'PATTERN' | 'WARNING' | 'ACHIEVEMENT' | 'RECOMMENDATION';
  title: string;
  description: string;
  metric: string; // e.g., "18% more than last month"
  actionable: boolean;
  suggestedActions?: ActionSuggestion[];
  timestamp: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/** Gợi ý hành động */
export interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'POSITIVE' | 'NEUTRAL' | 'WARNING';
  estimatedResult?: string; // e.g., "Save 500k/month"
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category?: string;
  potentialSavingsCents?: number;
  potentialRevenueIncCents?: number;
}

/** Gamification Achievement */
export interface Achievement {
  id: string;
  type: 'MILESTONE' | 'STREAK' | 'BEHAVIOR' | 'CHALLENGE';
  title: string;
  description: string;
  icon?: string;
  unlockedAt?: Date;
  progress?: number; // 0-100
  progressText?: string;
}

/** Gamification Stats */
export interface GamificationStats {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  pointsToNextLevel: number;
  currentStreak: number; // days
  achievements: Achievement[];
  badges: Achievement[];
}

/** Blockchain/Timeline cho analytics */
export interface AnalyticsTimeline {
  date: Date;
  budgetSpent: number;
  budgetLimit: number;
  goalsProgress: number; // % trung bình
  anomalies: Anomaly[];
}

/** Interface định vị dữ liệu */
export interface IAnalyticsRepository {
  saveBudgetPrediction(
    workspaceId: string,
    budgetId: string,
    prediction: BudgetPrediction,
  ): Promise<any>;
  getPredictions(workspaceId: string): Promise<BudgetPrediction[]>;
  saveInsights(workspaceId: string, insights: Insight[]): Promise<any>;
  getInsights(workspaceId: string, limit: number): Promise<Insight[]>;
  saveAnomalies(workspaceId: string, anomalies: Anomaly[]): Promise<any>;
  getAnomalies(workspaceId: string): Promise<Anomaly[]>;
  getAchievements(workspaceId: string): Promise<Achievement[]>;
  unlockAchievement(workspaceId: string, achievementId: string): Promise<void>;
}

/** Interface cho Business Logic */
export interface IBudgetAnalyticsService {
  analyzeBudgetProgress(workspaceId: string): Promise<BudgetProgress[]>;
  predictBudgetOverflow(
    workspaceId: string,
    budgetId: string,
  ): Promise<BudgetPrediction>;
  detectBudgetAnomalies(workspaceId: string): Promise<Anomaly[]>;
  suggestBudgetBreakdown(
    totalBudget: number,
    workspaceId?: string,
  ): Promise<Map<string, number>>;
}

export interface IGoalAnalyticsService {
  analyzeGoalProgress(workspaceId: string): Promise<GoalProgress[]>;
  calculateGoalVelocity(
    goalId: string,
    historicalData: Array<{ date: Date; amount: number }>,
  ): Promise<number>;
  predictGoalCompletion(
    goalId: string,
    currentAmount: number,
    targetAmount: number,
    velocity: number,
  ): Promise<Date>;
}

export interface IInsightService {
  generateInsights(workspaceId: string): Promise<Insight[]>;
  detectAnomalies(workspaceId: string): Promise<Anomaly[]>;
  generatePatternInsights(workspaceId: string): Promise<Insight[]>;
  generateWarningInsights(workspaceId: string): Promise<Insight[]>;
}

export interface IActionSuggestionService {
  suggestBudgetOptimization(workspaceId: string): Promise<ActionSuggestion[]>;
  suggestGoalStrategy(goalId: string): Promise<ActionSuggestion[]>;
  suggestSpendingReduction(
    categoryId: string,
    targetReduction: number,
  ): Promise<ActionSuggestion[]>;
  suggestRevenueIncrease(
    currentRevenue: number,
    targetRevenue: number,
  ): Promise<ActionSuggestion[]>;
}

export interface IGamificationService {
  getStats(workspaceId: string): Promise<GamificationStats>;
  updatePoints(
    workspaceId: string,
    points: number,
    reason: string,
  ): Promise<void>;
  checkAndUnlockAchievements(workspaceId: string): Promise<Achievement[]>;
  getStreakData(
    workspaceId: string,
  ): Promise<{ currentStreak: number; longestStreak: number }>;
}

export interface IFinancialCalculationService {
  calculateMonthlyTrend(data: Array<{ date: Date; amount: number }>): number; // % change
  calculateCategoryDistribution(
    spendingByCategory: Map<string, number>,
  ): Promise<Map<string, number>>;
  calculateBudgetVsActual(
    limits: Map<string, number>,
    actuals: Map<string, number>,
  ): Map<string, number>;
  forecastMonthEnd(
    currentSpent: number,
    daysElapsed: number,
    daysInMonth: number,
  ): number;
}
