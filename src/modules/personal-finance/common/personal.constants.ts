export const PersonalQuotaKeys = {
  ACCOUNTS_MAX: 'personal.accounts.max',
  CATEGORIES_MAX: 'personal.categories.max',
  TAGS_MAX: 'personal.tags.max',
  TX_MONTHLY: 'personal.transactions.monthly',
  RECURRING_MAX: 'personal.recurring_rules.max',
  ATTACHMENTS_MAX: 'personal.attachments.max',
} as const;

export type PersonalQuotaKey =
  (typeof PersonalQuotaKeys)[keyof typeof PersonalQuotaKeys];

export const PersonalFlags = {
  FINANCE_REPORTS: 'finance.report',
  FINANCE_AI_ADVICE: 'finance.ai_advice',
  REPORT_EXPORT: 'report.export',
} as const;

export type PersonalFlag = (typeof PersonalFlags)[keyof typeof PersonalFlags];
