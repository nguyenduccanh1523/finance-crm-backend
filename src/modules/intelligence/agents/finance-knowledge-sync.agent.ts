import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RabbitMqConsumerService } from '../../core/rabbitmq/rabbitmq-consumer.service';

import { FINANCE_KNOWLEDGE_SYNC_QUEUE } from '../workflow/workflow.constants';
import { WorkflowTaskMessage } from '../workflow/workflow-message.types';

import { WorkflowRunEntity } from '../entities/workflow-run.entity';
import { WorkflowTaskEntity } from '../entities/workflow-task.entity';
import { AgentRunEntity } from '../entities/agent-run.entity';

import {
  AgentName,
  AgentRunStatus,
  WorkflowRunStatus,
  WorkflowTaskStatus,
} from '../workflow/workflow.enums';

import { WorkflowTaskDispatcherService } from '../workflow/workflow-task-dispatcher.service';

import { IntelligenceRagPipelineService } from '../intelligence-rag-pipline.service';

@Injectable()
export class FinanceKnowledgeSyncAgent implements OnModuleInit {
  private readonly logger = new Logger(FinanceKnowledgeSyncAgent.name);

  constructor(
    private readonly rabbitMqConsumerService: RabbitMqConsumerService,
    private readonly dispatcher: WorkflowTaskDispatcherService,

    @InjectRepository(WorkflowRunEntity)
    private readonly workflowRunRepo: Repository<WorkflowRunEntity>,

    @InjectRepository(WorkflowTaskEntity)
    private readonly workflowTaskRepo: Repository<WorkflowTaskEntity>,

    @InjectRepository(AgentRunEntity)
    private readonly agentRunRepo: Repository<AgentRunEntity>,

    private readonly ragPipelineService: IntelligenceRagPipelineService,
  ) {}

  async onModuleInit() {
    await this.rabbitMqConsumerService.consume<WorkflowTaskMessage>({
      queueName: FINANCE_KNOWLEDGE_SYNC_QUEUE,
      handler: async (message) => {
        await this.handle(message);
      },
    });
  }

  private async handle(message: WorkflowTaskMessage) {
    this.logger.log(
      `Received FinanceKnowledgeSync task=${message.workflowTaskId}, run=${message.workflowRunId}`,
    );

    const run = await this.workflowRunRepo.findOne({
      where: {
        id: message.workflowRunId,
      },
    });

    if (!run) {
      throw new Error(`Workflow run not found: ${message.workflowRunId}`);
    }

    const task = await this.workflowTaskRepo.findOne({
      where: {
        id: message.workflowTaskId,
      },
    });

    if (!task) {
      throw new Error(`Workflow task not found: ${message.workflowTaskId}`);
    }

    if (task.status === WorkflowTaskStatus.COMPLETED) {
      this.logger.warn(`Task already completed, skip: ${task.id}`);
      return;
    }

    const nextAttemptCount = task.attemptCount + 1;

    const agentRun = await this.agentRunRepo.save(
      this.agentRunRepo.create({
        workflowRunId: run.id,
        workflowTaskId: task.id,
        workspaceId: run.workspaceId,
        orgId: run.orgId,
        agentName: AgentName.FINANCE_KNOWLEDGE_SYNC_AGENT,
        status: AgentRunStatus.RUNNING,
        contextJson: {
          message,
          attempt: nextAttemptCount,
        },
        startedAt: new Date(),
      }),
    );

    const startedAt = new Date();
    const startedAtMs = Date.now();

    try {
      if (!run.workspaceId) {
        throw new Error(
          'workspaceId is required for FinanceKnowledgeSyncAgent',
        );
      }

      if (!message.payload?.budgetId) {
        throw new Error('budgetId is required for finance knowledge sync');
      }

      if (!message.payload?.goalId) {
        throw new Error('goalId is required for finance knowledge sync');
      }

      if (!message.payload?.month) {
        throw new Error('month is required for finance knowledge sync');
      }

      const workspaceId = run.workspaceId;

      await this.workflowTaskRepo.update(task.id, {
        status: WorkflowTaskStatus.RUNNING,
        attemptCount: nextAttemptCount,
        lockedAt: new Date(),
        startedAt,
        assignedWorker: 'finance-knowledge-sync-agent',
      });

      const result = await this.ragPipelineService.syncFinanceIntoRag({
        workspaceId,
        budgetId: message.payload.budgetId,
        goalId: message.payload.goalId,
        month: message.payload.month,
        transactionWindowDays: message.payload.transactionWindowDays ?? 30,
        transactionLimit: message.payload.transactionLimit ?? 50,
      });

      const finishedAt = new Date();
      const durationMs = Date.now() - startedAtMs;

      const successMetrics = {
        durationMs,
        attempt: nextAttemptCount,
        success: true,
      } as any;

      await this.workflowTaskRepo.update(task.id, {
        status: WorkflowTaskStatus.COMPLETED,
        outputPayload: result as any,
        finishedAt,
        lockedAt: null,
        errorCode: null,
        errorMessage: null,
      });

      await this.agentRunRepo.update(agentRun.id, {
        status: AgentRunStatus.COMPLETED,
        resultJson: result as any,
        metricsJson: successMetrics,
        finishedAt,
        errorCode: null,
        errorMessage: null,
      });

      await this.workflowRunRepo.update(run.id, {
        status: WorkflowRunStatus.COMPLETED,
        resultJson: {
          financeKnowledgeSync: result,
        } as any,
        metricsJson: {
          completedTaskCount: 1,
          failedTaskCount: 0,
          durationMs,
        } as any,
        finishedAt,
        errorCode: null,
        errorMessage: null,
      });

      this.logger.log(`Completed FinanceKnowledgeSync task=${task.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown agent error';

      const durationMs = Date.now() - startedAtMs;

      const failedMetrics = {
        durationMs,
        attempt: nextAttemptCount,
        success: false,
      } as any;

      const canRetry = nextAttemptCount < task.maxAttempts;

      await this.agentRunRepo.update(agentRun.id, {
        status: AgentRunStatus.FAILED,
        errorCode: 'FINANCE_KNOWLEDGE_SYNC_AGENT_FAILED',
        errorMessage,
        metricsJson: failedMetrics,
        finishedAt: new Date(),
      });

      if (canRetry) {
        await this.workflowTaskRepo.update(task.id, {
          status: WorkflowTaskStatus.QUEUED,
          attemptCount: nextAttemptCount,
          lockedAt: null,
          errorCode: 'FINANCE_KNOWLEDGE_SYNC_RETRY',
          errorMessage,
        });

        const updatedTask = await this.workflowTaskRepo.findOneOrFail({
          where: {
            id: task.id,
          },
        });

        await this.dispatcher.dispatchTask({
          run,
          task: updatedTask,
        });

        this.logger.warn(
          `Retry FinanceKnowledgeSync task=${task.id}, attempt=${nextAttemptCount}`,
        );

        return;
      }

      await this.workflowTaskRepo.update(task.id, {
        status: WorkflowTaskStatus.FAILED,
        attemptCount: nextAttemptCount,
        lockedAt: null,
        finishedAt: new Date(),
        errorCode: 'FINANCE_KNOWLEDGE_SYNC_FAILED',
        errorMessage,
      });

      await this.workflowRunRepo.update(run.id, {
        status: WorkflowRunStatus.FAILED,
        finishedAt: new Date(),
        errorCode: 'WORKFLOW_FAILED',
        errorMessage,
      });

      this.logger.error(
        `FinanceKnowledgeSync failed permanently. task=${task.id}`,
        error,
      );
    }
  }
}
