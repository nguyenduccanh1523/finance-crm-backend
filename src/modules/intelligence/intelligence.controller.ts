import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IntelligenceQueryService } from './intelligence-query.service';

@Controller('intelligence/debug')
export class IntelligenceController {
  constructor(
    private readonly intelligenceQueryService: IntelligenceQueryService,
  ) {}

  @Get('mcp-tools')
  async listMcpTools() {
    return this.intelligenceQueryService.testFinanceGatewayTools();
  }

  @Get('monthly-summary')
  async getMonthlySummary(
    @Query('workspaceId') workspaceId: string,
    @Query('month') month: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!month) {
      throw new BadRequestException('month is required');
    }

    return this.intelligenceQueryService.testGetMonthlySummary(
      workspaceId,
      month,
    );
  }

  @Get('budget-snapshot')
  async getBudgetSnapshot(
    @Query('workspaceId') workspaceId: string,
    @Query('budgetId') budgetId: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!budgetId) {
      throw new BadRequestException('budgetId is required');
    }

    return this.intelligenceQueryService.testGetBudgetSnapshot(
      workspaceId,
      budgetId,
    );
  }

  @Get('goal-progress')
  async getGoalProgress(
    @Query('workspaceId') workspaceId: string,
    @Query('goalId') goalId: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!goalId) {
      throw new BadRequestException('goalId is required');
    }

    return this.intelligenceQueryService.testGetGoalProgress(
      workspaceId,
      goalId,
    );
  }

  @Get('search-transactions')
  async searchTransactions(
    @Query('workspaceId') workspaceId: string,
    @Query('windowDays') windowDays = '30',
    @Query('limit') limit = '20',
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    return this.intelligenceQueryService.testSearchTransactions(
      workspaceId,
      Number(windowDays),
      Number(limit),
    );
  }
}
