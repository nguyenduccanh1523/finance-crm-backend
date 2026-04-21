import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Query,
  Post,
  Delete,
} from '@nestjs/common';
import { IntelligenceQueryService } from './intelligence-query.service';
import { RagUpsertDebugDto } from './dto/rag-upsert-debug.dto';
import { RagRelatedChunkDebugDto } from './dto/rag-related-chunks-debug.dto';

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

  @Post('rag/upsert')
  async ragUpsert(@Body() body: RagUpsertDebugDto) {
    if (!body.workspaceId)
      throw new BadRequestException('workspaceId is required');
    if (!body.documents?.length)
      throw new BadRequestException('documents is required');

    return this.intelligenceQueryService.testRagUpsert(
      body.workspaceId,
      body.documents,
    );
  }

  @Get('rag/retrieve')
  async ragRetrieve(
    @Query('workspaceId') workspaceId: string,
    @Query('query') query: string,
    @Query('topK') topK = '5',
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!query) {
      throw new BadRequestException('query is required');
    }

    return this.intelligenceQueryService.testRagRetrieve(
      workspaceId,
      query,
      Number(topK),
    );
  }

  @Post('rag/related-chunks')
  async ragRelatedChunks(@Body() body: RagRelatedChunkDebugDto) {
    if (!body.workspaceId)
      throw new BadRequestException('workspaceId is required');
    if (!body.chunkIds?.length)
      throw new BadRequestException('chunkIds is required');

    return this.intelligenceQueryService.testGetRelatedChunks(
      body.workspaceId,
      body.chunkIds,
    );
  }

  @Delete('rag/source')
  async deleteRagSource(
    @Query('workspaceId') workspaceId: string,
    @Query('sourceType') sourceType: string,
    @Query('sourceRef') sourceRef: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    if (!sourceType) throw new BadRequestException('sourceType is required');
    if (!sourceRef) throw new BadRequestException('sourceRef is required');

    return this.intelligenceQueryService.testDeleteKnowledgeBySource(
      workspaceId,
      sourceType,
      sourceRef,
    );
  }
}
