import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IGamificationService,
  Achievement,
  GamificationStats,
} from '../interfaces/analytics.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gamification Service
 * SOLID:
 * - Single Responsibility: Chỉ handle gamification logic
 * - Dependency Injection: Inject required repos
 *
 * Features:
 * - Points system
 * - Levels
 * - Achievements/Badges
 * - Streaks
 * - Leaderboard
 */

// Giả sử có entities sau (cần tạo):
// - UserGamification (id, workspaceId, totalPoints, level, currentStreak, longestStreak)
// - UnlockedAchievement (id, workspaceId, achievementId, unlockedAt)

@Injectable()
export class GamificationService implements IGamificationService {
  // Predefined achievements
  private readonly ACHIEVEMENTS = {
    FIRST_BUDGET: {
      id: 'ach_first_budget',
      type: 'MILESTONE',
      title: 'Bước đầu tiên',
      description: 'Tạo ngân sách đầu tiên',
      points: 50,
    },
    BUDGET_MASTER: {
      id: 'ach_budget_master',
      type: 'MILESTONE',
      title: 'Chủ nhân ngân sách',
      description: 'Tạo 10 ngân sách',
      points: 200,
    },
    GOAL_ACHIEVER: {
      id: 'ach_goal_achiever',
      type: 'MILESTONE',
      title: 'Người đạt mục tiêu',
      description: 'Hoàn thành 1 mục tiêu tài chính',
      points: 300,
    },
    GOAL_SUPERSTAR: {
      id: 'ach_goal_superstar',
      type: 'MILESTONE',
      title: 'Siêu sao mục tiêu',
      description: 'Hoàn thành 5 mục tiêu tài chính',
      points: 1000,
    },
    ON_BUDGET: {
      id: 'ach_on_budget',
      type: 'BEHAVIOR',
      title: 'Kiểm soát chi tiêu',
      description: 'Không vượt budget 1 tuần',
      points: 100,
    },
    FRUGAL_KING: {
      id: 'ach_frugal_king',
      type: 'BEHAVIOR',
      title: 'Vua tiết kiệm',
      description: 'Không vượt budget 1 tháng',
      points: 500,
    },
    SEVEN_DAY_STREAK: {
      id: 'ach_7day_streak',
      type: 'STREAK',
      title: 'Cháy tuần',
      description: '7 ngày liên tiếp không vượt budget',
      points: 150,
    },
    THIRTY_DAY_STREAK: {
      id: 'ach_30day_streak',
      type: 'STREAK',
      title: 'Vô địch tháng',
      description: '30 ngày liên tiếp không vượt budget',
      points: 1000,
    },
    INSIGHT_SEEKER: {
      id: 'ach_insight_seeker',
      type: 'BEHAVIOR',
      title: 'Tìm kiếm Insight',
      description: 'Xem 5 insights khác nhau',
      points: 75,
    },
    ACTION_TAKER: {
      id: 'ach_action_taker',
      type: 'BEHAVIOR',
      title: 'Người hành động',
      description: 'Thực hiện 1 gợi ý từ hệ thống',
      points: 150,
    },
  };

  // Points configuration
  private readonly POINTS_CONFIG = {
    CREATE_BUDGET: 50,
    CREATE_GOAL: 50,
    UPDATE_BUDGET: 10,
    UPDATE_GOAL: 10,
    COMPLETE_GOAL: 500,
    STAY_ON_BUDGET: 25,
    VIEW_INSIGHT: 5,
    TAKE_ACTION: 100,
    DAILY_CHECK_IN: 10,
  };

  // Levels configuration
  private readonly LEVEL_CONFIG = {
    1: 0,
    2: 500,
    3: 1500,
    4: 3500,
    5: 7000,
    6: 12000,
    7: 18000,
    8: 25000,
    9: 35000,
    10: 50000,
  };

  constructor() {
    // Note: Nếu sử dụng DB, inject repositories tại đây
  }

  /**
   * Lấy stats gamification của user
   */
  async getStats(workspaceId: string): Promise<GamificationStats> {
    // Mock data - trong thực tế sẽ query từ DB
    const totalPoints = await this.getTotalPoints(workspaceId);
    const level = this.calculateLevel(totalPoints);
    const nextLevelPoints = this.LEVEL_CONFIG[Math.min(level + 1, 10)];
    const pointsToNextLevel = Math.max(0, nextLevelPoints - totalPoints);

    const currentStreak = await this.getCurrentStreak(workspaceId);
    const longestStreak = await this.getLongestStreak(workspaceId);
    const unlockedAchievements =
      await this.getUnlockedAchievements(workspaceId);

    return {
      totalPoints,
      level,
      nextLevelPoints,
      pointsToNextLevel,
      currentStreak,
      achievements: this.convertToAchievementList(unlockedAchievements),
      badges: this.getActiveBadges(unlockedAchievements),
    };
  }

  /**
   * Cập nhật points
   */
  async updatePoints(
    workspaceId: string,
    points: number,
    reason: string,
  ): Promise<void> {
    // TODO: Implement DB update
    console.log(
      `[Gamification] ${workspaceId} gained ${points} points - ${reason}`,
    );
  }

  /**
   * Kiểm tra và unlock achievements
   */
  async checkAndUnlockAchievements(
    workspaceId: string,
  ): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];
    const stats = await this.getStats(workspaceId);

    // Kiểm tra achievements dựa vào điều kiện
    const conditions = await this.evaluateConditions(workspaceId);

    for (const achievement of Object.values(this.ACHIEVEMENTS)) {
      if (
        conditions[achievement.id] &&
        !stats.achievements.some((a) => a.id === achievement.id)
      ) {
        const ach: Achievement = {
          id: achievement.id,
          type: achievement.type as any,
          title: achievement.title,
          description: achievement.description,
          unlockedAt: new Date(),
        };
        unlockedAchievements.push(ach);

        // Award points
        await this.updatePoints(
          workspaceId,
          achievement.points,
          `Unlock achievement: ${achievement.title}`,
        );
      }
    }

    return unlockedAchievements;
  }

  /**
   * Lấy thông tin streak
   */
  async getStreakData(
    workspaceId: string,
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    const currentStreak = await this.getCurrentStreak(workspaceId);
    const longestStreak = await this.getLongestStreak(workspaceId);

    return { currentStreak, longestStreak };
  }

  // ============== Helper Methods ==============

  private calculateLevel(points: number): number {
    for (let level = 10; level >= 1; level--) {
      if (points >= this.LEVEL_CONFIG[level]) {
        return level;
      }
    }
    return 1;
  }

  private async getTotalPoints(workspaceId: string): Promise<number> {
    // TODO: Query từ DB
    return 2500; // Mock
  }

  private async getCurrentStreak(workspaceId: string): Promise<number> {
    // TODO: Query từ DB dựa vào historical data
    return 7; // Mock
  }

  private async getLongestStreak(workspaceId: string): Promise<number> {
    // TODO: Query từ DB
    return 30; // Mock
  }

  private async getUnlockedAchievements(
    workspaceId: string,
  ): Promise<string[]> {
    // TODO: Query từ DB
    return [
      'ach_first_budget',
      'ach_on_budget',
      'ach_7day_streak',
      'ach_goal_achiever',
    ]; // Mock
  }

  private convertToAchievementList(unlockedIds: string[]): Achievement[] {
    const achievements: Achievement[] = [];

    for (const ach of Object.values(this.ACHIEVEMENTS)) {
      achievements.push({
        id: ach.id,
        type: ach.type as any,
        title: ach.title,
        description: ach.description,
        unlockedAt: unlockedIds.includes(ach.id) ? new Date() : undefined,
      });
    }

    return achievements;
  }

  private getActiveBadges(unlockedIds: string[]): Achievement[] {
    // Badges = achievements đặc biệt (milestones, streaks)
    return this.convertToAchievementList(unlockedIds)
      .filter((a) => a.type === 'MILESTONE' || a.type === 'STREAK')
      .filter((a) => a.unlockedAt);
  }

  private async evaluateConditions(
    workspaceId: string,
  ): Promise<Record<string, boolean>> {
    // TODO: Evaluate achievement conditions based on workspace data
    return {
      ach_first_budget: true,
      ach_budget_master: false,
      ach_goal_achiever: true,
      ach_goal_superstar: false,
      ach_on_budget: true,
      ach_frugal_king: false,
      ach_7day_streak: true,
      ach_30day_streak: false,
      ach_insight_seeker: false,
      ach_action_taker: false,
    };
  }

  /**
   * Generate motivational message based on stats
   */
  getMotivationalMessage(stats: GamificationStats): string {
    const messages = [
      `🔥 Bạn đang ở level ${stats.level}! Chỉ cần ${stats.pointsToNextLevel} điểm nữa để lên level ${stats.level + 1}`,
      `🎯 Streak ${stats.currentStreak} ngày! Tiếp tục duy trì tốt lắm!`,
      `⭐ Bạn có ${stats.achievements.length} achievements đã mở khoá`,
      `💪 Bạn là top người kiểm soát chi tiêu. Tiếp tục tập luyện!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
