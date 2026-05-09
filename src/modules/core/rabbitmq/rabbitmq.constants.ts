export const RABBITMQ_EXCHANGES = {
  AGENT: 'intelligence.agent.exchange',
  RETRY: 'intelligence.agent.retry.exchange',
  DLX: 'intelligence.agent.dlx',
} as const;

export const RABBITMQ_QUEUES = {
  /**
   * Workflow v1 - cần triển khai trước
   */
  FINANCE_KNOWLEDGE_SYNC: 'intelligence.agent.finance_knowledge_sync.q',
  FINANCE_KNOWLEDGE_SYNC_RETRY:
    'intelligence.agent.finance_knowledge_sync.retry.q',

  /**
   * Các queue mở rộng sau này
   */
  EVIDENCE: 'intelligence.agent.evidence_collector.q',
  SPEND: 'intelligence.agent.spend_analysis.q',
  FORECAST: 'intelligence.agent.budget_forecast.q',
  RECOMMENDATION: 'intelligence.agent.recommendation.q',

  EVIDENCE_RETRY: 'intelligence.agent.evidence_collect.retry.q',
  SPEND_RETRY: 'intelligence.agent.spend_analysis.retry.q',
  FORECAST_RETRY: 'intelligence.agent.budget_forecast.retry.q',
  RECOMMENDATION_RETRY: 'intelligence.agent.recommendation.retry.q',

  DLQ: 'intelligence.agent.dlq',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  /**
   * Workflow v1 - dùng cho FinanceKnowledgeSyncAgent
   */
  FINANCE_KNOWLEDGE_SYNC: 'agent.finance_knowledge_sync.execute',

  /**
   * Các agent sau này
   */
  EVIDENCE: 'agent.evidence_collect.execute',
  SPEND: 'agent.spend_analysis.execute',
  FORECAST: 'agent.budget_forecast.execute',
  RECOMMENDATION: 'agent.recommendation.execute',
} as const;

export const RABBITMQ_RETRY_TTL_MS = {
  DEFAULT: 15_000,
  FINANCE_KNOWLEDGE_SYNC: 15_000,
} as const;
