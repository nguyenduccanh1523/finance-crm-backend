import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMqModule } from '../../core/rabbitmq/rabbitmq.module';
import { ArchestraMcpModule } from '../../core/mcp/archestra-mcp.module';

import { WorkflowRunEntity } from './entities/workflow-run.entity';
import { WorkflowTaskEntity } from './entities/workflow-task.entity';
import { AgentRunEntity } from './entities/agent-run.entity';
import { ToolCallLogEntity } from './entities/tool-call-log.entity';
import { SourceRecordEntity } from './entities/source-record.entity';
import { ObservationEntity } from './entities/observation.entity';
import { AssertionEntity } from './entities/assertion.entity';
import { SignalEntity } from './entities/signal.entity';

import { IntelligenceController } from './intelligence.controller';
import { IntelligenceOrchestratorService } from './intelligence-orchestrator.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowAggregatorService } from './workflow-aggregator.service';
import { ScoringService } from './scoring.service';
import { GuardrailPolicyService } from './guardrail-policy.service';
import { IntelligenceQueryService } from './intelligence-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowRunEntity,
      WorkflowTaskEntity,
      AgentRunEntity,
      ToolCallLogEntity,
      SourceRecordEntity,
      ObservationEntity,
      AssertionEntity,
      SignalEntity,
    ]),
    RabbitMqModule,
    ArchestraMcpModule,
  ],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceOrchestratorService,
    WorkflowTemplateService,
    WorkflowAggregatorService,
    ScoringService,
    GuardrailPolicyService,
    IntelligenceQueryService,
  ],
  exports: [IntelligenceOrchestratorService, IntelligenceQueryService],
})
export class IntelligenceModule {}
