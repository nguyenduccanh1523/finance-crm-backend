import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { RabbitMqPublisherService } from '../../core/rabbitmq/rabbitmq-publisher.service';

import { WorkflowRunEntity } from '../entities/workflow-run.entity';
import { WorkflowTaskEntity } from '../entities/workflow-task.entity';
import { WorkflowTaskMessage } from './workflow-message.types';
import { WORKFLOW_AGENT_EXCHANGE } from './workflow.constants';

@Injectable()
export class WorkflowTaskDispatcherService {
  constructor(
    private readonly rabbitMqPublisherService: RabbitMqPublisherService,
  ) {}

  async dispatchTask(params: {
    run: WorkflowRunEntity;
    task: WorkflowTaskEntity;
  }) {
    const { run, task } = params;

    const message: WorkflowTaskMessage = {
      messageId: randomUUID(),
      correlationId: run.id,

      workflowRunId: run.id,
      workflowTaskId: task.id,

      workspaceId: run.workspaceId,
      orgId: run.orgId,
      requestedByUserId: run.requestedByUserId ?? null,

      taskType: task.taskType,
      agentName: task.agentName,

      queueName: task.queueName,
      routingKey: task.routingKey,

      attempt: task.attemptCount + 1,
      payload: task.inputPayload ?? {},

      createdAt: new Date().toISOString(),
    };

    await this.rabbitMqPublisherService.publish(
      WORKFLOW_AGENT_EXCHANGE,
      task.routingKey,
      message,
    );
  }
}
