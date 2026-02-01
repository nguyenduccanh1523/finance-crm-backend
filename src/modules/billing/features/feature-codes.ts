export const FeatureCodes = {
  CRM_BASIC: 'crm.basic',
  CRM_PIPELINE: 'crm.pipeline',
  REPORT_EXPORT: 'report.export',
  PROJECTS: 'work.projects',
  TASKS: 'work.tasks',
  AI_INSIGHTS: 'ai.insights',
  FINANCE_REPORTS: 'finance.report',
  FINANCE_AI_ADVICE: 'finance.ai_advice',
} as const;

export type FeatureCode = (typeof FeatureCodes)[keyof typeof FeatureCodes];
