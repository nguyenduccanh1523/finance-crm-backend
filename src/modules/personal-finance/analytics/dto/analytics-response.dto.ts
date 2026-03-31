import {
  BudgetProgress,
  GoalProgress,
  Anomaly,
  Insight,
  ActionSuggestion,
  GamificationStats,
  Achievement,
  BudgetPrediction,
} from '../interfaces/analytics.interface';

/**
 * Response DTOs cho Frontend
 * Separation of Concerns: DTOs riêng biệt từ domain models
 */

export class BudgetProgressResponseDto {
  budgetId: string;
  categoryId?: string;
  categoryName?: string;

  // Thông tin cơ bản
  limitCents: number;
  limitFormatted: string;

  // Đã dùng
  spentCents: number;
  spentFormatted: string;
  percentageUsed: number;

  // Còn lại
  remainingCents: number;
  remainingFormatted: string;

  // Trạng thái
  status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED' | 'CRITICAL';
  statusColor: string;

  // Dự đoán
  prediction?: BudgetPredictionResponseDto;

  // Timeline
  daysLeftInMonth: number;
  periodMonth: string;

  constructor(progress: BudgetProgress & { prediction?: BudgetPrediction }) {
    this.budgetId = progress.budgetId;
    this.categoryId = progress.categoryId;
    this.categoryName = progress.categoryName || 'Uncategorized';

    this.limitCents = progress.limitCents;
    this.limitFormatted = this.formatCurrency(progress.limitCents);

    this.spentCents = progress.spentCents;
    this.spentFormatted = this.formatCurrency(progress.spentCents);
    this.percentageUsed = progress.percentageUsed;

    this.remainingCents = progress.remainingCents;
    this.remainingFormatted = this.formatCurrency(progress.remainingCents);

    this.status = progress.status;
    this.statusColor = this.getStatusColor(progress.status);

    if (progress.prediction) {
      this.prediction = new BudgetPredictionResponseDto(progress.prediction);
    }

    this.daysLeftInMonth = progress.daysLeftInMonth;
  }

  private formatCurrency(vnd: number): string {
    return `₫${vnd.toLocaleString('vi-VN')}`;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ON_TRACK: '#10b981',
      WARNING: '#f59e0b',
      EXCEEDED: '#ef4444',
      CRITICAL: '#991b1b',
    };
    return colors[status] || '#6b7280';
  }
}

export class BudgetPredictionResponseDto {
  predictedSpendFormatted: string;
  overagePercentage: number;
  isOverBudget: boolean;
  daysUntilOverBudget?: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  trendIcon: string;
  confidence: number;
  message: string;

  constructor(prediction: BudgetPrediction) {
    this.predictedSpendFormatted = `₫${prediction.predictedSpendCents.toLocaleString('vi-VN')}`;
    this.overagePercentage = prediction.overagePercentage;
    this.isOverBudget = prediction.isOverBudget;
    this.daysUntilOverBudget = prediction.daysUntilOverBudget;
    this.trendDirection = prediction.trendDirection;
    this.trendIcon = {
      UP: '📈',
      DOWN: '📉',
      STABLE: '➡️',
    }[prediction.trendDirection];
    this.confidence = prediction.confidence;

    if (prediction.isOverBudget) {
      this.message = `⚠️ Dự đoán cuối tháng: Vượt ${prediction.overagePercentage}%`;
      if (prediction.daysUntilOverBudget) {
        this.message += ` (sau ${prediction.daysUntilOverBudget} ngày)`;
      }
    } else {
      this.message = `✅ Dự đoán an toàn`;
    }
  }
}

export class GoalProgressResponseDto {
  goalId: string;
  name: string;

  // Thông tin cơ bản
  targetAmountFormatted: string;
  currentAmountFormatted: string;
  amountNeededFormatted: string;

  // Tiến độ
  percentageAchieved: number;
  status: 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'COMPLETED';
  statusIcon: string;

  // Timeline
  daysLeft: number;
  estimatedCompletionDate: string;
  isAheadSchedule: boolean;
  daysAheadSchedule?: number;

  // Tốc độ
  velocityPerDayFormatted: string;
  motivationalMessage: string;

  constructor(progress: GoalProgress) {
    this.goalId = progress.goalId;
    this.name = progress.name;

    this.targetAmountFormatted = this.formatCurrency(
      progress.targetAmountCents,
    );
    this.currentAmountFormatted = this.formatCurrency(
      progress.currentAmountCents,
    );
    this.amountNeededFormatted = this.formatCurrency(
      progress.amountNeededCents,
    );

    this.percentageAchieved = progress.percentageAchieved;
    this.status = progress.status;
    this.statusIcon = {
      ON_TRACK: '🎯',
      AHEAD: '🔥',
      BEHIND: '⚠️',
      COMPLETED: '✅',
    }[progress.status];

    this.daysLeft = progress.daysLeft;
    this.estimatedCompletionDate =
      progress.estimatedCompletionDate.toLocaleDateString('vi-VN');
    this.isAheadSchedule = progress.isAheadSchedule;
    this.daysAheadSchedule = progress.daysAheadSchedule;

    this.velocityPerDayFormatted = `₫${progress.velocityPerDay.toLocaleString('vi-VN')}/ngày`;

    if (progress.isAheadSchedule) {
      this.motivationalMessage = `🔥 Đang vượt tiến độ ${progress.daysAheadSchedule} ngày!`;
    } else if (progress.status === 'COMPLETED') {
      this.motivationalMessage = `✅ Mục tiêu đạt được!`;
    } else {
      this.motivationalMessage = `Cần tăng tốc độ để hoàn thành đúng hạn`;
    }
  }

  private formatCurrency(vnd: number): string {
    return `₫${vnd.toLocaleString('vi-VN')}`;
  }
}

export class AnomalyResponseDto {
  id?: string;
  type: 'SPENDING_SPIKE' | 'UNUSUAL_PATTERN' | 'CATEGORY_OVERSPEND';
  typeIcon: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severityColor: string;
  metricChange: number;
  metricChangeFormatted: string;
  suggestedAction?: string;
  affectedCategories?: string[];

  constructor(anomaly: Anomaly) {
    this.type = anomaly.type;
    this.typeIcon = {
      SPENDING_SPIKE: '💥',
      UNUSUAL_PATTERN: '🔄',
      CATEGORY_OVERSPEND: '📊',
    }[anomaly.type];
    this.title = anomaly.title;
    this.description = anomaly.description;
    this.severity = anomaly.severity;
    this.severityColor = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#991b1b',
    }[anomaly.severity];
    this.metricChange = anomaly.metricChange;
    this.metricChangeFormatted = `${anomaly.metricChange > 0 ? '+' : ''}${anomaly.metricChange}%`;
    this.suggestedAction = anomaly.suggestedAction;
    this.affectedCategories = anomaly.affectedCategories;
  }
}

export class InsightResponseDto {
  id: string;
  type: 'PATTERN' | 'WARNING' | 'ACHIEVEMENT' | 'RECOMMENDATION';
  typeIcon: string;
  title: string;
  description: string;
  metric: string;
  actionable: boolean;
  suggestedActions?: ActionSuggestionResponseDto[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  priorityColor: string;
  timestamp: string;

  constructor(insight: Insight) {
    this.id = insight.id;
    this.type = insight.type;
    this.typeIcon = {
      PATTERN: '📊',
      WARNING: '⚠️',
      ACHIEVEMENT: '🎉',
      RECOMMENDATION: '💡',
    }[insight.type];
    this.title = insight.title;
    this.description = insight.description;
    this.metric = insight.metric;
    this.actionable = insight.actionable;
    this.suggestedActions = insight.suggestedActions?.map(
      (a) => new ActionSuggestionResponseDto(a),
    );
    this.priority = insight.priority;
    this.priorityColor = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
    }[insight.priority];
    this.timestamp = new Date(insight.timestamp).toLocaleString('vi-VN');
  }
}

export class ActionSuggestionResponseDto {
  id: string;
  title: string;
  description: string;
  impact: 'POSITIVE' | 'NEUTRAL' | 'WARNING';
  impactIcon: string;
  estimatedResult?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  difficultyColor: string;
  category?: string;
  potentialSavingsFormatted?: string;
  potentialRevenueIncFormatted?: string;
  actionUrl?: string; // Link to implement action

  constructor(suggestion: ActionSuggestion) {
    this.id = suggestion.id;
    this.title = suggestion.title;
    this.description = suggestion.description;
    this.impact = suggestion.impact;
    this.impactIcon = {
      POSITIVE: '✅',
      NEUTRAL: '➡️',
      WARNING: '⚠️',
    }[suggestion.impact];
    this.estimatedResult = suggestion.estimatedResult;
    this.difficulty = suggestion.difficulty;
    this.difficultyColor = {
      EASY: '#10b981',
      MEDIUM: '#f59e0b',
      HARD: '#ef4444',
    }[suggestion.difficulty];
    this.category = suggestion.category;
    if (suggestion.potentialSavingsCents) {
      this.potentialSavingsFormatted = `Tiết kiệm ₫${suggestion.potentialSavingsCents.toLocaleString('vi-VN')}`;
    }
    if (suggestion.potentialRevenueIncCents) {
      this.potentialRevenueIncFormatted = `Tăng doanh thu ₫${suggestion.potentialRevenueIncCents.toLocaleString('vi-VN')}`;
    }
  }
}

export class AchievementResponseDto {
  id: string;
  type: 'MILESTONE' | 'STREAK' | 'BEHAVIOR' | 'CHALLENGE';
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isUnlocked: boolean;
  progress?: number;
  progressText?: string;

  constructor(achievement: Achievement) {
    this.id = achievement.id;
    this.type = achievement.type;
    this.title = achievement.title;
    this.description = achievement.description;
    this.icon = achievement.icon || this.getDefaultIcon(achievement.type);
    this.unlockedAt = achievement.unlockedAt?.toLocaleString('vi-VN');
    this.isUnlocked = !!achievement.unlockedAt;
    this.progress = achievement.progress;
    this.progressText = achievement.progressText;
  }

  private getDefaultIcon(type: string): string {
    const icons: Record<string, string> = {
      MILESTONE: '🏆',
      STREAK: '🔥',
      BEHAVIOR: '📈',
      CHALLENGE: '🎯',
    };
    return icons[type] || '⭐';
  }
}

export class GamificationResponseDto {
  totalPoints: number;
  pointsFormatted: string;
  level: number;
  nextLevelPoints: number;
  pointsToNextLevel: number;
  levelProgressPercentage: number;

  currentStreak: number;
  longestStreak?: number;
  streakMessage: string;

  achievements: AchievementResponseDto[];
  badges: AchievementResponseDto[];

  leaderboardPosition?: number;
  leaderboardRank?: string;

  constructor(
    stats: GamificationStats & {
      longestStreak?: number;
      leaderboardPosition?: number;
    },
  ) {
    this.totalPoints = stats.totalPoints;
    this.pointsFormatted = `${stats.totalPoints.toLocaleString('vi-VN')} điểm`;
    this.level = stats.level;
    this.nextLevelPoints = stats.nextLevelPoints;
    this.pointsToNextLevel = stats.pointsToNextLevel;
    this.levelProgressPercentage =
      ((stats.nextLevelPoints - stats.pointsToNextLevel) /
        stats.nextLevelPoints) *
      100;

    this.currentStreak = stats.currentStreak;
    this.longestStreak = stats.longestStreak;
    this.streakMessage = `🔥 ${stats.currentStreak} ngày liên tiếp`;

    this.achievements = stats.achievements.map(
      (a) => new AchievementResponseDto(a),
    );
    this.badges = stats.badges.map((b) => new AchievementResponseDto(b));

    this.leaderboardPosition = stats.leaderboardPosition;
  }
}

export class DashboardResponseDto {
  budgets: BudgetProgressResponseDto[];
  goals: GoalProgressResponseDto[];
  insights: InsightResponseDto[];
  anomalies: AnomalyResponseDto[];
  suggestions: ActionSuggestionResponseDto[];
  gamification: GamificationResponseDto;
  summary: {
    totalBudget: string;
    totalSpent: string;
    buono: string;
    overallStatus: 'HEALTHY' | 'CAUTION' | 'CRITICAL';
    statusMessage: string;
  };
}
