import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMqModule } from '../core/rabbitmq/rabbitmq.module';
import { ArchestraMcpModule } from '../core/mcp/archestra-mcp.module';

import { WorkflowRunEntity } from './entities/workflow-run.entity';
import { WorkflowTaskEntity } from './entities/workflow-task.entity';
import { AgentRunEntity } from './entities/agent-run.entity';
import { ToolCallLogEntity } from './entities/tool-call-log.entity';
import { SourceRecordEntity } from './entities/source-record.entity';
import { ObservationEntity } from './entities/observation.entity';
import { AssertionEntity } from './entities/assertion.entity';
import { SignalEntity } from './entities/signal.entity';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';

import { IntelligenceController } from './intelligence.controller';
// import { IntelligenceOrchestratorService } from './intelligence-orchestrator.service';
// import { WorkflowTemplateService } from './workflow-template.service';
// import { WorkflowAggregatorService } from './workflow-aggregator.service';
// import { ScoringService } from './scoring.service';
// import { GuardrailPolicyService } from './guardrail-policy.service';
import { IntelligenceQueryService } from './intelligence-query.service';
import { IntelligenceNormalizerService } from './intelligence-normalizer.service';
import { IntelligenceRagPipelineService } from './intelligence-rag-pipline.service';
import { In } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeChunk]),
    ArchestraMcpModule,
  ],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceQueryService,
    IntelligenceNormalizerService,
    IntelligenceRagPipelineService,
  ],
  exports: [
    IntelligenceQueryService,
    IntelligenceNormalizerService,
    IntelligenceRagPipelineService,
  ],
})
export class IntelligenceModule {}
