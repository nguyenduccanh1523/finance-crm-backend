export const RABBITMQ_EXCHANGES = {
  AGENT: 'intelligence.agent.exchange',
  RETRY: 'intelligence.agent.retry.exchange',
  DLX: 'intelligence.agent.dlx',
};

export const RABBITMQ_QUEUES = {
  EVIDENCE: 'intelligence.agent.evidence_collector.q',
  SPEND: 'intelligence.agent.spend_analysis.q',
  FORECAST: 'intelligence.agent.budget_forecast.q',
  RECOMMENDATION: 'intelligence.agent.recommendation.q',

  EVIDENCE_RETRY: 'intelligence.agent.evidence_collect.retry.q',
  SPEND_RETRY: 'intelligence.agent.spend_analysis.retry.q',
  FORECAST_RETRY: 'intelligence.agent.budget_forecast.retry.q',
  RECOMMENDATION_RETRY: 'intelligence.agent.recommendation.retry.q',

  DLQ: 'intelligence.agent.dlq',
};

export const RABBITMQ_ROUTING_KEYS = {
  EVIDENCE: 'agent.evidence_collect.execute',
  SPEND: 'agent.spend_analysis.execute',
  FORECAST: 'agent.budget_forecast.execute',
  RECOMMENDATION: 'agent.recommendation.execute',
};
