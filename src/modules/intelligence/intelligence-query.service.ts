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
}
