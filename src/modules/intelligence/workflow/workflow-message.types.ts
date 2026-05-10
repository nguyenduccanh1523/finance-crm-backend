import { AgentName, WorkflowTaskType } from './workflow.enums';

export type WorkflowTaskMessage = {
  messageId: string;
  correlationId: string;

  workflowRunId: string;
  workflowTaskId: string;

  workspaceId?: string | null;
  orgId?: string | null;
  requestedByUserId?: string | null;

  taskType: WorkflowTaskType;
  agentName: AgentName;

  queueName: string;
  routingKey: string;

  attempt: number;
  payload: Record<string, any>;

  createdAt: string;
};
