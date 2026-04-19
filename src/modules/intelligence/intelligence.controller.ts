import { Controller, Get, Query } from '@nestjs/common';
import { IntelligenceQueryService } from './intelligence-query.service';

@Controller('intelligence/debug')
export class IntelligenceController {
  constructor(private readonly queryService: IntelligenceQueryService) {}

  @Get('mcp-tools')
  async listMcpTools() {
    return this.queryService.testFinanceGatewayTools();
  }

  @Get('monthly-summary')
  async testMonthlySummary(
    @Query('workspaceId') workspaceId: string,
    @Query('month') month: string,
  ) {
    return this.queryService.testGetMonthlySummary(workspaceId, month);
  }
}
