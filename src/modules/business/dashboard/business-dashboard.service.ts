import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AuthenticatedUser,
  OrganizationContextService,
} from '../../core/organizations/organization-context.service';

@Injectable()
export class BusinessDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
  ) {}

  private toNumber(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private signed(value: number, suffix: string): string {
    return `${value > 0 ? '+' : ''}${value}${suffix}`;
  }

  private priority(value: unknown): 'LOW' | 'MEDIUM' | 'HIGH' {
    const priority = this.toNumber(value);
    return priority >= 2 ? 'HIGH' : priority === 1 ? 'MEDIUM' : 'LOW';
  }

  async getDashboard(
    user: AuthenticatedUser,
    activeOrgId?: string,
    fallbackOrgId?: string,
  ) {
    const { organization, accessRole } =
      await this.organizationContextService.resolveDashboardOrganization(
        user,
        activeOrgId,
        fallbackOrgId,
      );
    const orgId = organization.id;
    const queryParams = [orgId, organization.timezone];

    const [
      summaryRows,
      workloadRows,
      pipelineRows,
      taskStatusRows,
      cashFlowRows,
    ] = await Promise.all([
      this.dataSource.query(
        `WITH bounds AS (
             SELECT
               date_trunc('day', NOW() AT TIME ZONE $2) AT TIME ZONE $2 AS today_start,
               (date_trunc('day', NOW() AT TIME ZONE $2) + interval '1 day') AT TIME ZONE $2 AS tomorrow_start,
               date_trunc('month', NOW() AT TIME ZONE $2) AT TIME ZONE $2 AS month_start,
               (date_trunc('month', NOW() AT TIME ZONE $2) + interval '1 month') AT TIME ZONE $2 AS next_month_start,
               (date_trunc('month', NOW() AT TIME ZONE $2) - interval '1 month') AT TIME ZONE $2 AS previous_month_start
           )
           SELECT
             (SELECT COUNT(*)::int FROM crm_customers WHERE org_id = $1 AND deleted_at IS NULL) AS active_clients,
             (SELECT COUNT(*)::int FROM crm_customers, bounds WHERE org_id = $1 AND deleted_at IS NULL AND created_at >= bounds.month_start) AS clients_this_month,
             (SELECT COUNT(*)::int FROM projects p LEFT JOIN statuses s ON s.id = p.status_id AND s.org_id = p.org_id WHERE p.org_id = $1 AND p.deleted_at IS NULL AND COALESCE(s.is_done, false) = false) AS running_projects,
             (SELECT COUNT(*)::int FROM tasks t LEFT JOIN statuses s ON s.id = t.status_id AND s.org_id = t.org_id WHERE t.org_id = $1 AND t.deleted_at IS NULL AND COALESCE(s.is_done, false) = false AND t.priority >= 2) AS high_priority_tasks,
             (SELECT COUNT(*)::int FROM tasks t INNER JOIN statuses s ON s.id = t.status_id AND s.org_id = t.org_id WHERE t.org_id = $1 AND t.deleted_at IS NULL AND s.is_done = true) AS tasks_done,
             (SELECT COUNT(*)::int FROM tasks t INNER JOIN statuses s ON s.id = t.status_id AND s.org_id = t.org_id, bounds WHERE t.org_id = $1 AND t.deleted_at IS NULL AND s.is_done = true AND t.updated_at >= bounds.today_start AND t.updated_at < bounds.tomorrow_start) AS tasks_done_today,
             (SELECT COALESCE(SUM(ip.amount_cents), 0)::text FROM invoice_payments ip INNER JOIN invoices i ON i.id = ip.invoice_id, bounds WHERE i.org_id = $1 AND i.deleted_at IS NULL AND i.currency = $3 AND ip.paid_at >= bounds.month_start) AS monthly_revenue,
             (SELECT COALESCE(SUM(ip.amount_cents), 0)::numeric FROM invoice_payments ip INNER JOIN invoices i ON i.id = ip.invoice_id, bounds WHERE i.org_id = $1 AND i.deleted_at IS NULL AND i.currency = $3 AND ip.paid_at >= bounds.previous_month_start AND ip.paid_at < bounds.month_start) AS previous_month_revenue,
             (SELECT COUNT(*)::int FROM invoices i LEFT JOIN statuses s ON s.id = i.status_id AND s.org_id = i.org_id WHERE i.org_id = $1 AND i.deleted_at IS NULL AND COALESCE(s.is_done, false) = false) AS pending_invoices,
             (SELECT COUNT(*)::int FROM timesheet_entries WHERE org_id = $1 AND LOWER(status) IN ('pending', 'submitted', 'waiting')) AS timesheets_waiting,
             (SELECT COUNT(*)::int FROM timesheet_entries, bounds WHERE org_id = $1 AND LOWER(status) IN ('pending', 'submitted', 'waiting') AND work_date < (bounds.today_start AT TIME ZONE $2)::date) AS late_timesheets,
             (SELECT COUNT(*)::int FROM crm_activities, bounds WHERE org_id = $1 AND UPPER(type) IN ('MEETING', 'CALL') AND occurred_at >= bounds.today_start AND occurred_at < bounds.tomorrow_start + interval '7 days') AS upcoming_meetings,
             (SELECT COUNT(DISTINCT customer_id)::int FROM crm_activities, bounds WHERE org_id = $1 AND occurred_at >= bounds.today_start AND UPPER(type) IN ('FOLLOW_UP', 'FOLLOW-UP', 'CALL')) AS follow_up_clients,
             (SELECT COUNT(*)::int FROM tasks t, bounds WHERE t.org_id = $1 AND t.deleted_at IS NULL AND t.due_at >= bounds.month_start AND t.due_at < bounds.next_month_start) AS monthly_tasks,
             (SELECT COUNT(*)::int FROM tasks t INNER JOIN statuses s ON s.id = t.status_id AND s.org_id = t.org_id, bounds WHERE t.org_id = $1 AND t.deleted_at IS NULL AND t.due_at >= bounds.month_start AND t.due_at < bounds.next_month_start AND s.is_done = true) AS monthly_tasks_done
          FROM bounds`,
        [...queryParams, organization.currency],
      ),
      this.dataSource.query(
        `WITH bounds AS (
             SELECT date_trunc('day', NOW() AT TIME ZONE $2) AT TIME ZONE $2 AS today_start,
                    (date_trunc('day', NOW() AT TIME ZONE $2) + interval '1 day') AT TIME ZONE $2 AS tomorrow_start
           )
           SELECT t.id, t.title, t.priority, t.due_at, wt.name AS module, s.name AS status
             FROM tasks t
             LEFT JOIN work_types wt ON wt.id = t.work_type_id AND wt.org_id = t.org_id
             LEFT JOIN statuses s ON s.id = t.status_id AND s.org_id = t.org_id
             CROSS JOIN bounds
            WHERE t.org_id = $1 AND t.deleted_at IS NULL AND COALESCE(s.is_done, false) = false
              AND t.due_at >= bounds.today_start AND t.due_at < bounds.tomorrow_start
            ORDER BY t.priority DESC, t.due_at ASC
            LIMIT 10`,
        queryParams,
      ),
      this.dataSource.query(
        `SELECT stage, COUNT(*)::int AS deals
             FROM crm_customers
            WHERE org_id = $1 AND deleted_at IS NULL
            GROUP BY stage
            ORDER BY MIN(created_at), stage`,
        [orgId],
      ),
      this.dataSource.query(
        `SELECT s.name, COUNT(t.id)::int AS tasks
             FROM statuses s
             LEFT JOIN tasks t ON t.status_id = s.id AND t.org_id = s.org_id AND t.deleted_at IS NULL
            WHERE s.org_id = $1 AND UPPER(s.entity_type) = 'TASK'
            GROUP BY s.id, s.name, s.sort_order
            ORDER BY s.sort_order, s.name`,
        [orgId],
      ),
      this.dataSource.query(
        `WITH months AS (
             SELECT generate_series(
               date_trunc('month', NOW() AT TIME ZONE $2) - interval '5 months',
               date_trunc('month', NOW() AT TIME ZONE $2), interval '1 month'
             ) AS month
           )
           SELECT TO_CHAR(months.month, 'YYYY-MM') AS month,
                  COALESCE(inv.invoiced, 0)::text AS invoiced_cents,
                  COALESCE(pay.received, 0)::text AS received_cents,
                  COALESCE(exp.spent, 0)::text AS expense_cents
             FROM months
             LEFT JOIN LATERAL (SELECT SUM(total_cents)::numeric AS invoiced FROM invoices WHERE org_id = $1 AND deleted_at IS NULL AND currency = $3 AND issue_date >= months.month::date AND issue_date < (months.month + interval '1 month')::date) inv ON true
             LEFT JOIN LATERAL (SELECT SUM(ip.amount_cents)::numeric AS received FROM invoice_payments ip INNER JOIN invoices i ON i.id = ip.invoice_id WHERE i.org_id = $1 AND i.deleted_at IS NULL AND i.currency = $3 AND ip.paid_at >= months.month AT TIME ZONE $2 AND ip.paid_at < (months.month + interval '1 month') AT TIME ZONE $2) pay ON true
             LEFT JOIN LATERAL (SELECT SUM(amount_cents)::numeric AS spent FROM org_expenses WHERE org_id = $1 AND deleted_at IS NULL AND currency = $3 AND occurred_at >= months.month AT TIME ZONE $2 AND occurred_at < (months.month + interval '1 month') AT TIME ZONE $2) exp ON true
            ORDER BY months.month`,
        [...queryParams, organization.currency],
      ),
    ]);

    const summary = summaryRows[0] || {};
    const previousRevenue = this.toNumber(summary.previous_month_revenue);
    const currentRevenue = this.toNumber(summary.monthly_revenue);
    const revenueChange =
      previousRevenue === 0
        ? 0
        : Number(
            (
              ((currentRevenue - previousRevenue) / previousRevenue) *
              100
            ).toFixed(2),
          );
    const monthlyTasks = this.toNumber(summary.monthly_tasks);
    const completionPercent =
      monthlyTasks === 0
        ? 0
        : Number(
            (
              (this.toNumber(summary.monthly_tasks_done) / monthlyTasks) *
              100
            ).toFixed(2),
          );
    const totalDeals = pipelineRows.reduce(
      (total: number, row: Record<string, unknown>) =>
        total + this.toNumber(row.deals),
      0,
    );
    const pipeline = pipelineRows.map((row: Record<string, unknown>) => ({
      stage: String(row.stage),
      deals: this.toNumber(row.deals),
      percentage:
        totalDeals === 0
          ? 0
          : Number(((this.toNumber(row.deals) / totalDeals) * 100).toFixed(2)),
    }));

    const response = {
      organization: {
        id: organization.id,
        name: organization.name,
        currency: organization.currency,
        timezone: organization.timezone,
      },
      accessRole,
      generatedAt: new Date().toISOString(),
      kpis: {
        activeClients: {
          value: this.toNumber(summary.active_clients),
          change: this.toNumber(summary.clients_this_month),
          changeLabel: this.signed(
            this.toNumber(summary.clients_this_month),
            ' this month',
          ),
        },
        runningProjects: {
          value: this.toNumber(summary.running_projects),
          change: this.toNumber(summary.high_priority_tasks),
          changeLabel: `${this.toNumber(summary.high_priority_tasks)} high priority`,
        },
        tasksDone: {
          value: this.toNumber(summary.tasks_done),
          change: this.toNumber(summary.tasks_done_today),
          changeLabel: this.signed(
            this.toNumber(summary.tasks_done_today),
            ' today',
          ),
        },
        monthlyRevenue: {
          amountCents: String(summary.monthly_revenue || '0'),
          currency: organization.currency.trim(),
          changePercent: revenueChange,
          changeLabel: this.signed(revenueChange, '%'),
        },
      },
      todayWorkload: {
        total: workloadRows.length,
        items: workloadRows.map((row: Record<string, unknown>) => ({
          id: row.id,
          task: row.title,
          module: row.module || null,
          dueAt: row.due_at || null,
          priority: this.priority(row.priority),
          status: row.status || null,
        })),
      },
      salesPipeline: { totalDeals, stages: pipeline },
      quickFocus: {
        followUpClients: this.toNumber(summary.follow_up_clients),
        pendingInvoices: this.toNumber(summary.pending_invoices),
        timesheetsWaiting: this.toNumber(summary.timesheets_waiting),
      },
      summary: {
        upcomingMeetings: this.toNumber(summary.upcoming_meetings),
        lateTimesheets: this.toNumber(summary.late_timesheets),
        monthlyTaskCompletionPercent: completionPercent,
      },
      charts: {
        salesPipeline: {
          type: 'bar',
          labels: pipeline.map((item) => item.stage),
          series: [{ name: 'Deals', data: pipeline.map((item) => item.deals) }],
        },
        tasksByStatus: {
          type: 'doughnut',
          labels: taskStatusRows.map((row: Record<string, unknown>) =>
            String(row.name),
          ),
          series: [
            {
              name: 'Tasks',
              data: taskStatusRows.map((row: Record<string, unknown>) =>
                this.toNumber(row.tasks),
              ),
            },
          ],
        },
        cashFlowLast6Months: {
          type: 'line',
          labels: cashFlowRows.map((row: Record<string, unknown>) =>
            String(row.month),
          ),
          series: [
            {
              name: 'Invoiced',
              data: cashFlowRows.map((row: Record<string, unknown>) =>
                this.toNumber(row.invoiced_cents),
              ),
            },
            {
              name: 'Received',
              data: cashFlowRows.map((row: Record<string, unknown>) =>
                this.toNumber(row.received_cents),
              ),
            },
            {
              name: 'Expenses',
              data: cashFlowRows.map((row: Record<string, unknown>) =>
                this.toNumber(row.expense_cents),
              ),
            },
          ],
        },
      },
    };

    return {
      statusCode: 200,
      message: 'Business dashboard retrieved successfully',
      data: response,
    };
  }
}
