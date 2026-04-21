import { Injectable } from '@nestjs/common';
import { ArchestraMcpClient } from 'src/modules/core/mcp/archestra-mcp.client';

@Injectable()
export class IntelligenceQueryService {
  constructor(private readonly mcpClient: ArchestraMcpClient) {}

  async testFinanceGatewayTools() {
    const tools = await this.mcpClient.listTools();
    console.log('Available tools from Archestra MCP Gateway:', tools);

    return {
      gateway: this.mcpClient.getGatewayConfig(),
      toolCount: tools.tools.length,
      tools: tools.tools,
    };
  }

  async testGetMonthlySummary(workspaceId: string, month: string) {
    const result = await this.mcpClient.callTool(
      'finance-core-mcp__get_monthly_summary',
      {
        input: {
          workspace_id: workspaceId,
          month,
        },
      },
    );

    console.log('Monthly summary result:', result);
    return result;
  }

  async testGetBudgetSnapshot(workspaceId: string, budgetId: string) {
    return this.mcpClient.callTool('finance-core-mcp__get_budget_snapshot', {
      input: {
        workspace_id: workspaceId,
        budget_id: budgetId,
      },
    });
  }

  async testGetGoalProgress(workspaceId: string, goalId: string) {
    return this.mcpClient.callTool('finance-core-mcp__get_goal_progress', {
      input: {
        workspace_id: workspaceId,
        goal_id: goalId,
      },
    });
  }

  async testSearchTransactions(
    workspaceId: string,
    windowDays: number,
    limit: number,
  ) {
    return this.mcpClient.callTool('finance-core-mcp__search_transactions', {
      input: {
        workspace_id: workspaceId,
        window_days: windowDays,
        limit,
      },
    });
  }

  async testRagUpsert(
    workspaceId: string,
    documents: Array<{
      source_type: string;
      source_ref: string;
      title?: string;
      text: string;
      metadata?: Record<string, any>;
    }>,
  ) {
    return this.mcpClient.callTool(
      'knowledge-rag-mcp__upsert_finance_knowledge',
      {
        input: {
          workspace_id: workspaceId,
          documents,
        },
      },
    );
  }

  async testRagRetrieve(workspaceId: string, query: string, topK: number) {
    return this.mcpClient.callTool(
      'knowledge-rag-mcp__hybrid_retrieve_finance_knowledge',
      {
        input: {
          workspace_id: workspaceId,
          query,
          top_k: topK,
        },
      },
    );
  }

  async testGetRelatedChunks(workspaceId: string, chunkIds: string[]) {
    return this.mcpClient.callTool('knowledge-rag-mcp__get_related_chunks', {
      input: {
        workspace_id: workspaceId,
        chunk_ids: chunkIds,
      },
    });
  }

  async testDeleteKnowledgeBySource(
    workspaceId: string,
    sourceType: string,
    sourceRef: string,
  ) {
    return this.mcpClient.callTool(
      'knowledge-rag-mcp__delete_knowledge_by_source',
      {
        input: {
          workspace_id: workspaceId,
          source_type: sourceType,
          source_ref: sourceRef,
        },
      },
    );
  }
}
