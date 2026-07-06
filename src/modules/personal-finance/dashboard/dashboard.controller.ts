import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('personal/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /**
   * GET /personal/dashboard
   *
   * Trả về toàn bộ data cho màn hình dashboard:
   * - balance          : Tổng số dư + xu hướng tài chính (trend text)
   * - thisMonthIncome  : Thu nhập tháng này + so sánh tháng trước
   * - thisMonthExpense : Chi tiêu tháng này + so sánh tháng trước
   * - weeklySpending   : Chi tiêu từng ngày trong 7 ngày gần nhất (bar chart)
   * - recentTransactions: 5 giao dịch mới nhất
   */
  @Get()
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user);
  }
}
