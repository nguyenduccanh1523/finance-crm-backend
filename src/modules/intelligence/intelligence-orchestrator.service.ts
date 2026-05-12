import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WorkflowRunEntity } from './entities/workflow-run.entity';
import { WorkflowTaskEntity } from './entities/workflow-task.entity';
import { AgentRunEntity } from './entities/agent-run.entity';

import {
  AgentName,
  WorkflowName,
  WorkflowRunStatus,
  WorkflowScopeType,
  WorkflowTaskStatus,
  WorkflowTaskType,
  WorkflowTriggerSource,
  WorkflowVersion,
} from './workflow/workflow.enums';

import {
  FINANCE_KNOWLEDGE_SYNC_QUEUE,
  FINANCE_KNOWLEDGE_SYNC_ROUTING_KEY,
} from './workflow/workflow.constants';

import { WorkflowTaskDispatcherService } from './workflow/workflow-task-dispatcher.service';

@Injectable()
export class IntelligenceOrchestratorService {
  constructor(
    @InjectRepository(WorkflowRunEntity)
    private readonly workflowRunRepo: Repository<WorkflowRunEntity>,

    @InjectRepository(WorkflowTaskEntity)
    private readonly workflowTaskRepo: Repository<WorkflowTaskEntity>,

    @InjectRepository(AgentRunEntity)
    private readonly agentRunRepo: Repository<AgentRunEntity>,

    private readonly workflowTaskDispatcherService: WorkflowTaskDispatcherService,
  ) {}

  async startFinanceKnowledgeSyncWorkflow(params: {
    workspaceId: string;
    orgId?: string | null;
    requestedByUserId?: string | null;

    budgetId: string;
    goalId: string;
    month: string;
    transactionWindowDays?: number;
    transactionLimit?: number;

    idempotencyKey?: string | null;
  }) {
    if (!params.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    if (!params.budgetId) {
      throw new BadRequestException('budgetId is required');
    }

    if (!params.goalId) {
      throw new BadRequestException('goalId is required');
    }

    if (!params.month) {
      throw new BadRequestException('month is required');
    }

    if (params.idempotencyKey) {
      const existedRun = await this.workflowRunRepo.findOne({
        where: {
          idempotencyKey: params.idempotencyKey,
        },
      });

      if (existedRun) {
        return {
          workflowRunId: existedRun.id,
          status: existedRun.status,
          idempotent: true,
        };
      }
    }

    const requestPayload = {
      budgetId: params.budgetId,
      goalId: params.goalId,
      month: params.month,
      transactionWindowDays: params.transactionWindowDays ?? 30,
      transactionLimit: params.transactionLimit ?? 50,
    };

    const planningSnapshot = {
      strategy: 'SINGLE_TASK_V1',
      tasks: [
        {
          order: 1,
          taskType: WorkflowTaskType.FINANCE_KNOWLEDGE_SYNC,
          agentName: AgentName.FINANCE_KNOWLEDGE_SYNC_AGENT,
          queueName: FINANCE_KNOWLEDGE_SYNC_QUEUE,
          routingKey: FINANCE_KNOWLEDGE_SYNC_ROUTING_KEY,
        },
      ],
    };

    const run = await this.workflowRunRepo.save(
      this.workflowRunRepo.create({
        workflowName: WorkflowName.FINANCE_KNOWLEDGE_SYNC,
        workflowVersion: WorkflowVersion.V1,
        scopeType: WorkflowScopeType.WORKSPACE,

        workspaceId: params.workspaceId,
        orgId: params.orgId ?? null,
        requestedByUserId: params.requestedByUserId ?? null,

        triggerSource: WorkflowTriggerSource.API,
        triggerEvent: 'finance_knowledge_sync_requested',

        requestPayload,
        planningSnapshot,

        status: WorkflowRunStatus.RUNNING,
        priority: 5,
        idempotencyKey: params.idempotencyKey ?? null,
        startedAt: new Date(),
      }),
    );

    const task = await this.workflowTaskRepo.save(
      this.workflowTaskRepo.create({
        workflowRunId: run.id,
        taskOrder: 1,

        taskType: WorkflowTaskType.FINANCE_KNOWLEDGE_SYNC,
        agentName: AgentName.FINANCE_KNOWLEDGE_SYNC_AGENT,

        queueName: FINANCE_KNOWLEDGE_SYNC_QUEUE,
        routingKey: FINANCE_KNOWLEDGE_SYNC_ROUTING_KEY,

        dependsOnTaskIds: [],
        inputPayload: requestPayload,

        status: WorkflowTaskStatus.QUEUED,
        attemptCount: 0,
        maxAttempts: 3,
        timeoutSeconds: 300,
        visibilityScope: 'workspace',
      }),
    );

    await this.workflowTaskDispatcherService.dispatchTask({
      run,
      task,
    });

    return {
      workflowRunId: run.id,
      firstTaskId: task.id,
      status: run.status,
      idempotent: false,
    };
  }

  async getWorkflowRun(workflowRunId: string) {
    const run = await this.workflowRunRepo.findOne({
      where: {
        id: workflowRunId,
      },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    const tasks = await this.workflowTaskRepo.find({
      where: {
        workflowRunId,
      },
      order: {
        taskOrder: 'ASC',
        createdAt: 'ASC',
      },
    });

    const agentRuns = await this.agentRunRepo.find({
      where: {
        workflowRunId,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return {
      ...run,
      tasks,
      agentRuns,
    };
  }
}
