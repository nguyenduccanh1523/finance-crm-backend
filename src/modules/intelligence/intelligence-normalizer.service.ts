import { Injectable } from '@nestjs/common';

type KnowledgeDocument = {
  source_type: string;
  source_ref: string;
  title?: string;
  text: string;
  metadata?: Record<string, any>;
};

type TransactionItem = {
  account_id: string;
  transaction_id: string;
  type: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  occurred_at?: string;
  note?: string;
  counterparty?: string;
};

@Injectable()
export class IntelligenceNormalizerService {
  normalizeBudgetSnapshot(workspaceId: string, budget: any): KnowledgeDocument {
    return {
      source_type: 'budget_snapshot',
      source_ref: `budget-${budget.budget_id}-${budget.period_month}`,
      title: `Budget snapshot ${budget.period_month}`,
      text: [
        `Budget snapshot for workspace ${workspaceId}.`,
        `Budget id is ${budget.budget_id}.`,
        `Account id is ${budget.account_id}.`,
        `Period month is ${budget.period_month}.`,
        `Category id is ${budget.category_id ?? 'none'}.`,
        `Budget limit is ${budget.amount_limit_cents} cents.`,
        `Spent amount is ${budget.spent_amount_cents} cents.`,
        `Remaining amount is ${budget.remaining_amount_cents} cents.`,
        `Overspent amount is ${budget.overspent_amount_cents} cents.`,
        `Usage percent is ${budget.usage_percent}.`,
        `Alert threshold percent is ${budget.alert_threshold_percent}.`,
        `Currency is ${budget.currency}.`,
        `Budget over status is ${budget.is_over_budget}.`,
        `Budget alert status is ${budget.is_alert}.`,
        `Budget health status is ${budget.status}.`,
      ].join(' '),
      metadata: {
        workspace_id: workspaceId,
        budget_id: budget.budget_id,
        account_id: budget.account_id,
        period_month: budget.period_month,
        category_id: budget.category_id,
        currency: budget.currency,
        status: budget.status,
      },
    };
  }

  normalizeGoalProgress(workspaceId: string, goal: any): KnowledgeDocument {
    return {
      source_type: 'goal_progress',
      source_ref: `goal-${goal.goal_id}-${goal.target_date}`,
      title: `Goal progress ${goal.name}`,
      text: [
        `Goal progress for workspace ${workspaceId}.`,
        `Goal id is ${goal.goal_id}.`,
        `Goal name is ${goal.name}.`,
        `Target amount is ${goal.target_amount_cents} cents.`,
        `Current amount is ${goal.current_amount_cents} cents.`,
        `Remaining amount is ${goal.remaining_amount_cents} cents.`,
        `Progress percent is ${goal.progress_percent}.`,
        `Target date is ${goal.target_date}.`,
        `Goal status is ${goal.status}.`,
        `Goal completed is ${goal.is_completed}.`,
        `Currency is ${goal.currency}.`,
      ].join(' '),
      metadata: {
        workspace_id: workspaceId,
        goal_id: goal.goal_id,
        account_id: goal.account_id,
        target_date: goal.target_date,
        status: goal.status,
        currency: goal.currency,
      },
    };
  }

  normalizeMonthlySummary(
    workspaceId: string,
    summary: any,
  ): KnowledgeDocument[] {
    const summaries = summary?.summaries ?? [];

    return summaries.map((item: any) => ({
      source_type: 'monthly_summary',
      source_ref: `summary-${summary.month}-${item.currency}`,
      title: `Monthly finance summary ${summary.month} ${item.currency}`,
      text: [
        `Monthly finance summary for workspace ${workspaceId}.`,
        `Month is ${summary.month}.`,
        `Currency is ${item.currency}.`,
        `Income total is ${item.income_total_cents} cents.`,
        `Expense total is ${item.expense_total_cents} cents.`,
        `Net cashflow is ${item.net_cashflow_cents} cents.`,
        `Transaction count is ${item.transaction_count}.`,
        `Top categories are ${JSON.stringify(item.top_categories ?? [])}.`,
      ].join(' '),
      metadata: {
        workspace_id: workspaceId,
        month: summary.month,
        currency: item.currency,
        income_total_cents: item.income_total_cents,
        expense_total_cents: item.expense_total_cents,
        net_cashflow_cents: item.net_cashflow_cents,
        transaction_count: item.transaction_count,
      },
    }));
  }

  normalizeTransactions(
    workspaceId: string,
    transactionResult: any,
    windowDays: number,
  ): KnowledgeDocument[] {
    const allowedTypes = new Set(['INCOME', 'EXPENSE', 'TRANSFER']);

    const items: TransactionItem[] = (transactionResult?.items ?? []).filter(
      (item: TransactionItem) => allowedTypes.has(item.type ?? ''),
    );

    const groupedByCurrency: Record<string, TransactionItem[]> = items.reduce(
      (acc, item) => {
        const currency = item.currency ?? 'UNKNOWN';
        if (!acc[currency]) acc[currency] = [];
        acc[currency].push(item);
        return acc;
      },
      {} as Record<string, TransactionItem[]>,
    );

    return (
      Object.entries(groupedByCurrency) as [string, TransactionItem[]][]
    ).map(([currency, currencyItems]) => ({
      source_type: 'cash_transaction_window',
      source_ref: `cash-transactions-${windowDays}d-${currency}`,
      title: `Cash Transactions window ${windowDays} days ${currency}`,
      text: [
        `Cash transaction summary for workspace ${workspaceId} over last ${windowDays} days.`,
        `Currency is ${currency}.`,
        `Included transaction types are INCOME, EXPENSE and TRANSFER.`,
        `Total transactions returned: ${currencyItems.length}.`,
        ...currencyItems
          .slice(0, 20)
          .map(
            (item: any, index: number) =>
              `Transaction ${index + 1}: account ${item.account_id}, type ${item.type}, amount ${item.amount_cents} cents, category ${item.category_id ?? 'none'}, occurred at ${item.occurred_at}, note ${item.note ?? 'none'}, counterparty ${item.counterparty ?? 'none'}.`,
          ),
      ].join(' '),
      metadata: {
        workspace_id: workspaceId,
        window_days: windowDays,
        currency,
        transaction_count: currencyItems.length,
        included_types: ['INCOME', 'EXPENSE', 'TRANSFER'],
        account_ids: [
          ...new Set(currencyItems.map((item: any) => item.account_id)),
        ],
      },
    }));
  }
}
