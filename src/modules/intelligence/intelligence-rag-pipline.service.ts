import { BadRequestException, Injectable } from '@nestjs/common';
import { IntelligenceNormalizerService } from './intelligence-normalizer.service';
import { IntelligenceQueryService } from './intelligence-query.service';

@Injectable()
export class IntelligenceRagPipelineService {
  constructor(
    private readonly intelligenceNormalizerService: IntelligenceNormalizerService,
    private readonly intelligenceQueryService: IntelligenceQueryService,
  ) {}

  private unwrapMcpResult(result: any, toolName: string) {
    if (result?.isError) {
      const message =
        result?.content?.[0]?.text ?? `MCP tool ${toolName} failed`;
      throw new BadRequestException(message);
    }

    if (result?.structuredContent) {
      return result.structuredContent;
    }

    const text = result?.content?.[0]?.text;
    if (!text) {
      throw new BadRequestException(`MCP tool ${toolName} returned no content`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new BadRequestException(
        `MCP tool ${toolName} returned invalid JSON: ${text}`,
      );
    }
  }

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

    if (input.budgetId) {
      const budgetResult =
        await this.intelligenceQueryService.testGetBudgetSnapshot(
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
      const goalResult =
        await this.intelligenceQueryService.testGetGoalProgress(
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

    const monthlySummaryResult =
      await this.intelligenceQueryService.testGetMonthlySummary(
        input.workspaceId,
        input.month,
      );

    const monthlySummaryData = this.unwrapMcpResult(
      monthlySummaryResult,
      'get_monthly_summary',
    );

    documents.push(
      ...this.intelligenceNormalizerService.normalizeMonthlySummary(
        input.workspaceId,
        monthlySummaryData,
      ),
    );

    const transactionsResult =
      await this.intelligenceQueryService.testSearchTransactions(
        input.workspaceId,
        transactionWindowDays,
        transactionLimit,
      );

    const transactionsData = this.unwrapMcpResult(
      transactionsResult,
      'search_transactions',
    );

    documents.push(
      ...this.intelligenceNormalizerService.normalizeTransactions(
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
