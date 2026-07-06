import { Injectable } from '@nestjs/common';
import { AccountsRepository } from '../accounts/accounts.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly accountsRepo: AccountsRepository,
    private readonly txRepo: TransactionsRepository,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  // ─── Date Helpers ────────────────────────────────────────────────────────────

  /** Trả về ngày đầu và ngày sau của tháng (UTC, exclusive end) */
  private monthBounds(year: number, month: number) {
    return {
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month + 1, 1)),
    };
  }

  /** 7 ngày gần nhất (from = 00:00 UTC của 6 ngày trước, to = now) */
  private last7DaysBounds() {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 6); // 6 ngày trước + hôm nay = 7 ngày
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }

  // ─── Delta % Calculator ───────────────────────────────────────────────────────

  /** Tính % thay đổi. Trả về 0 nếu không có dữ liệu tháng trước. */
  private deltaPercent(current: number, previous: number): number {
    if (previous === 0) return 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }

  // ─── Balance Trend ────────────────────────────────────────────────────────────

  /**
   * Phân tích xu hướng dòng tiền và trả về text mô tả.
   *
   * Logic:
   *   netFlowCents = thisIncome - thisExpense (dòng tiền thuần tháng này)
   *   > 0  → đang tích lũy (tiền vào > tiền ra)
   *   < 0  → đang thâm hụt (tiền ra > tiền vào)
   *   = 0  → cân bằng
   *
   * Kết hợp với so sánh tháng trước để cung cấp ngữ cảnh thêm.
   */
  private buildBalanceTrend(params: {
    netFlowCents: number;
    thisIncomeCents: number;
    thisExpenseCents: number;
    lastIncomeCents: number;
    lastExpenseCents: number;
    incomeVsLastPercent: number;
    expenseVsLastPercent: number;
  }): {
    status: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'WARNING';
    summary: string;
    detail: string;
  } {
    const {
      netFlowCents,
      thisIncomeCents,
      thisExpenseCents,
      lastIncomeCents,
      lastExpenseCents,
      incomeVsLastPercent,
      expenseVsLastPercent,
    } = params;

    const hasLastMonth = lastIncomeCents > 0 || lastExpenseCents > 0;

    // ── 1. Chi tiêu vượt thu nhập ──────────────────────────────────────────────
    if (netFlowCents < 0 && thisIncomeCents > 0) {
      const overspendPercent = Math.abs(
        ((thisExpenseCents - thisIncomeCents) / thisIncomeCents) * 100,
      ).toFixed(1);
      return {
        status: 'NEGATIVE',
        summary: 'Dòng tiền âm – chi nhiều hơn thu',
        detail: `Tháng này chi tiêu vượt thu nhập ${overspendPercent}%. Cân nhắc cắt giảm các khoản không cần thiết để cân bằng dòng tiền.`,
      };
    }

    // ── 2. Chỉ có chi tiêu, chưa ghi thu nhập ─────────────────────────────────
    if (netFlowCents < 0 && thisIncomeCents === 0) {
      return {
        status: 'WARNING',
        summary: 'Chưa ghi nhận thu nhập tháng này',
        detail: `Bạn đã chi ${thisExpenseCents.toLocaleString('vi-VN')} nhưng chưa ghi nhận thu nhập. Hãy thêm các giao dịch thu nhập để theo dõi dòng tiền chính xác.`,
      };
    }

    // ── 3. Chi tiêu tăng mạnh so tháng trước (> 20%) ──────────────────────────
    if (hasLastMonth && expenseVsLastPercent > 20 && netFlowCents >= 0) {
      return {
        status: 'WARNING',
        summary: 'Chi tiêu tăng đáng kể so tháng trước',
        detail: `Chi tiêu tháng này tăng ${expenseVsLastPercent.toFixed(1)}% so tháng trước. Dòng tiền vẫn dương nhưng cần kiểm tra lại các khoản chi.`,
      };
    }

    // ── 4. Thu nhập tăng + Chi tiêu giảm → tối ưu nhất ───────────────────────
    if (
      hasLastMonth &&
      incomeVsLastPercent > 0 &&
      expenseVsLastPercent < 0 &&
      netFlowCents > 0
    ) {
      return {
        status: 'POSITIVE',
        summary: 'Dòng tiền cải thiện xuất sắc',
        detail: `Thu nhập tăng ${incomeVsLastPercent.toFixed(1)}% và chi tiêu giảm ${Math.abs(expenseVsLastPercent).toFixed(1)}% so tháng trước. Dòng tiền đang rất lành mạnh!`,
      };
    }

    // ── 5. Thu nhập tăng rõ rệt (> 10%) ───────────────────────────────────────
    if (hasLastMonth && incomeVsLastPercent > 10 && netFlowCents > 0) {
      return {
        status: 'POSITIVE',
        summary: 'Thu nhập tăng trưởng, dòng tiền dương',
        detail: `Thu nhập tháng này tăng ${incomeVsLastPercent.toFixed(1)}% so với tháng trước. Hãy duy trì phong độ này!`,
      };
    }

    // ── 6. Thu nhập giảm mạnh (< -10%) ────────────────────────────────────────
    if (hasLastMonth && incomeVsLastPercent < -10) {
      return {
        status: 'WARNING',
        summary: 'Thu nhập giảm so tháng trước',
        detail: `Thu nhập giảm ${Math.abs(incomeVsLastPercent).toFixed(1)}% so tháng trước. Cần kiểm soát chi tiêu chặt hơn để duy trì dòng tiền dương.`,
      };
    }

    // ── 7. Dòng tiền dương, ổn định ───────────────────────────────────────────
    if (netFlowCents > 0) {
      const savingsRate =
        thisIncomeCents > 0
          ? ((netFlowCents / thisIncomeCents) * 100).toFixed(1)
          : '0';
      return {
        status: 'POSITIVE',
        summary: 'Dòng tiền dương – đang tích lũy',
        detail: `Tháng này bạn tiết kiệm được ${savingsRate}% thu nhập (dòng tiền dương ${netFlowCents.toLocaleString('vi-VN')}). Tiếp tục duy trì!`,
      };
    }

    // ── 8. Chưa có dữ liệu ────────────────────────────────────────────────────
    if (thisIncomeCents === 0 && thisExpenseCents === 0) {
      return {
        status: 'NEUTRAL',
        summary: 'Chưa có giao dịch tháng này',
        detail:
          'Hãy thêm các giao dịch thu nhập và chi tiêu để xem phân tích dòng tiền của bạn.',
      };
    }

    // ── 9. Cân bằng hoàn toàn ─────────────────────────────────────────────────
    return {
      status: 'NEUTRAL',
      summary: 'Dòng tiền cân bằng',
      detail:
        'Thu chi tháng này ngang nhau. Cân nhắc tăng thu nhập hoặc giảm chi tiêu để tạo ra dòng tiền dương.',
    };
  }

  // ─── Fill Missing Days ────────────────────────────────────────────────────────

  /**
   * Đảm bảo mảng weekly spending luôn có đủ 7 ngày.
   * Ngày không có giao dịch sẽ có totalCents = 0.
   */
  private fillWeeklyDays(
    rows: Array<{ date: string; totalCents: number }>,
    from: Date,
  ): Array<{ date: string; totalCents: number }> {
    const map = new Map(rows.map((r) => [r.date, r.totalCents]));
    const result: Array<{ date: string; totalCents: number }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      result.push({ date: key, totalCents: map.get(key) ?? 0 });
    }

    return result;
  }

  // ─── Change Label ─────────────────────────────────────────────────────────────

  /**
   * Tạo label hiển thị thay đổi so với tháng trước.
   * Ví dụ: "+4,000 so tháng trước" | "-2,000 so tháng trước" | "Không đổi"
   */
  private buildChangeLabel(current: number, previous: number): string {
    if (previous === 0) return 'Chưa có dữ liệu tháng trước';
    const delta = current - previous;
    if (delta === 0) return 'Không đổi so tháng trước';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toLocaleString('vi-VN')} so tháng trước`;
  }

  // ─── Main Method ──────────────────────────────────────────────────────────────

  async getDashboard(user: any) {
    // Lấy workspace (cần defaultCurrency cho income/expense)
    const ws = await this.wsService.getOrCreateByUserId(user.id);
    const workspaceId = ws.id;
    const defaultCurrency = ws.defaultCurrency ?? 'VND';

    // ── Tính date ranges ───────────────────────────────────────────────────────
    const now = new Date();
    const thisMonth = this.monthBounds(now.getUTCFullYear(), now.getUTCMonth());
    const lastMonth = this.monthBounds(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
    );
    const { from: weekFrom, to: weekTo } = this.last7DaysBounds();

    // ── Chạy 4 queries song song ────────────────────────────────────────────────
    const [accountsInfo, monthlyStats, weeklyRaw, recentTxs] =
      await Promise.all([
        // 1. Danh sách accounts kèm balance + currency từng tài khoản
        this.accountsRepo.getAccountsWithBalance(workspaceId),

        // 2. Income & Expense tháng này + tháng trước (1 query với CASE WHEN)
        this.txRepo.getDashboardMonthlyStats(
          workspaceId,
          thisMonth.start,
          thisMonth.end,
          lastMonth.start,
          lastMonth.end,
        ),

        // 3. Tất cả giao dịch 7 ngày gần nhất (mọi loại: expense, income, transfer)
        this.txRepo.getWeeklySpending(workspaceId, weekFrom, weekTo),

        // 4. 5 giao dịch gần nhất (mọi loại)
        this.txRepo.getRecentTransactions(workspaceId, 5),
      ]);

    // ── Dòng tiền thuần tháng này ──────────────────────────────────────────────
    // netFlowCents = thu nhập - chi tiêu → dương = đang tích lũy, âm = thâm hụt
    const netFlowCents =
      monthlyStats.thisIncomeCents - monthlyStats.thisExpenseCents;

    // ── Tính delta % so tháng trước ────────────────────────────────────────────
    const incomeVsLastPercent = this.deltaPercent(
      monthlyStats.thisIncomeCents,
      monthlyStats.lastIncomeCents,
    );
    const expenseVsLastPercent = this.deltaPercent(
      monthlyStats.thisExpenseCents,
      monthlyStats.lastExpenseCents,
    );

    // ── Balance trend text ──────────────────────────────────────────────────────
    const balanceTrend = this.buildBalanceTrend({
      netFlowCents,
      thisIncomeCents: monthlyStats.thisIncomeCents,
      thisExpenseCents: monthlyStats.thisExpenseCents,
      lastIncomeCents: monthlyStats.lastIncomeCents,
      lastExpenseCents: monthlyStats.lastExpenseCents,
      incomeVsLastPercent,
      expenseVsLastPercent,
    });

    // ── Fill đủ 7 ngày (ngày không có tx → 0) ──────────────────────────────────
    const weeklySpending = this.fillWeeklyDays(weeklyRaw, weekFrom);

    // ── Build response ──────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      message: 'Success',
      data: {
        /**
         * Thẻ 1: Cân bằng dòng tiền
         *
         * netFlowCents = thu nhập - chi tiêu tháng này
         *   → Đây là "cân bằng dòng tiền", không phải tổng tiền trong tài khoản
         *
         * accounts = danh sách từng tài khoản với balance + currency
         *   → Frontend có thể hiển thị từng tài khoản đang có bao nhiêu
         */
        balance: {
          // Dòng tiền thuần tháng này (income - expense)
          netFlowCents,
          currency: defaultCurrency,
          // Danh sách từng tài khoản kèm số dư hiện tại
          accounts: accountsInfo.accounts,
          accountCount: accountsInfo.accountCount,
          // Phân tích xu hướng dòng tiền
          trend: balanceTrend,
        },

        /**
         * Thẻ 2: Thu nhập tháng này
         * currency = đơn vị tiền mặc định của workspace
         */
        thisMonthIncome: {
          totalCents: monthlyStats.thisIncomeCents,
          currency: defaultCurrency,
          vsLastMonthCents:
            monthlyStats.thisIncomeCents - monthlyStats.lastIncomeCents,
          vsLastMonthPercent: incomeVsLastPercent,
          changeLabel: this.buildChangeLabel(
            monthlyStats.thisIncomeCents,
            monthlyStats.lastIncomeCents,
          ),
        },

        /**
         * Thẻ 3: Chi tiêu tháng này
         * remainingCents = income - expense (ngân sách còn lại)
         */
        thisMonthExpense: {
          totalCents: monthlyStats.thisExpenseCents,
          currency: defaultCurrency,
          vsLastMonthCents:
            monthlyStats.thisExpenseCents - monthlyStats.lastExpenseCents,
          vsLastMonthPercent: expenseVsLastPercent,
          // Còn lại = thu nhập - chi tiêu (hiển thị "Còn lại $X ngân sách")
          remainingCents: netFlowCents,
          changeLabel: this.buildChangeLabel(
            monthlyStats.thisExpenseCents,
            monthlyStats.lastExpenseCents,
          ),
        },

        /**
         * Biểu đồ: Hoạt động tài chính 7 ngày gần nhất
         * Gồm TẤT CẢ loại giao dịch: expense, income, transfer, budget, goal
         * Mảng luôn đủ 7 phần tử – ngày không có giao dịch totalCents = 0
         */
        weeklySpending,

        /**
         * Danh sách: 5 giao dịch gần nhất
         * Gồm TẤT CẢ loại giao dịch (không lọc theo type)
         */
        recentTransactions: recentTxs,
      },
    };
  }
}
