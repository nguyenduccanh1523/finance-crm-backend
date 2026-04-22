import { Injectable } from '@nestjs/common';
import { IntelligenceNormalizerService } from './intelligence-normalizer.service';
import { IntelligenceQueryService } from './intelligence-query.service';

@Injectable()
export class IntelligenceRagPipelineService {
  constructor(
    private readonly intelligenceNormalizerService: IntelligenceNormalizerService,
    private readonly intelligenceQueryService: IntelligenceQueryService,
  ) {}

  async syncFinanceIntoRag(input: {
    workspaceId: string;
    budgetId: string;
    goalId: string;
    month: string;
    transactionWindowDays: number;
    transactionLimit: number;
  }) {
    const transactionWindowDays = input.transactionWindowDays ?? 30;
    const transactionLimit = input.transactionLimit ?? 20;

    const documents: Array<{
      source_type: string;
      source_ref: string;
      title?: string;
      text: string;
      metadata?: Record<string, any>;
    }> = [];

    let budgetResult: any = null;
    let goalResult: any = null;
    let monthlySummaryResult: any = null;
    let transactionsResult: any = null;

    if (input.budgetId) {
      budgetResult = await this.intelligenceQueryService.testGetBudgetSnapshot(
        input.workspaceId,
        input.budgetId,
      );

      const budgetData =
        budgetResult?.structuredContent ??
        JSON.parse(budgetResult?.content?.[0]?.text ?? '{}');

      documents.push(
        this.intelligenceNormalizerService.normalizeBudgetSnapshot(
          input.workspaceId,
          budgetData,
        ),
      );
    }

    if (input.goalId) {
      goalResult = await this.intelligenceQueryService.testGetGoalProgress(
        input.workspaceId,
        input.goalId,
      );

      const goalData =
        goalResult?.structuredContent ??
        JSON.parse(goalResult?.content?.[0]?.text ?? '{}');

      documents.push(
        this.intelligenceNormalizerService.normalizeGoalProgress(
          input.workspaceId,
          goalData,
        ),
      );
    }

    monthlySummaryResult =
      await this.intelligenceQueryService.testGetMonthlySummary(
        input.workspaceId,
        input.month,
      );

    const monthlySummaryData =
      monthlySummaryResult?.structuredContent ??
      JSON.parse(monthlySummaryResult?.content?.[0]?.text ?? '{}');

    documents.push(
      this.intelligenceNormalizerService.normalizeMonthlySummary(
        input.workspaceId,
        monthlySummaryData,
      ),
    );

    transactionsResult =
      await this.intelligenceQueryService.testSearchTransactions(
        input.workspaceId,
        transactionWindowDays,
        transactionLimit,
      );

    const transactionsData =
      transactionsResult?.structuredContent ??
      JSON.parse(transactionsResult?.content?.[0]?.text ?? '{}');

    documents.push(
      this.intelligenceNormalizerService.normalizeTransactions(
        input.workspaceId,
        transactionsData,
        transactionWindowDays,
      ),
    );

    const upsertResult = await this.intelligenceQueryService.testRagUpsert(
      input.workspaceId,
      documents,
    );

    return {
      documents,
      upsertResult,
    };
  }
}
