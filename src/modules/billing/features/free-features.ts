/**
 * Free fallback ONLY for PERSONAL scope when user has NO subscription.
 * Keep it intentionally limited.
 */
export const FREE_FEATURES = {
  flags: {
    // finance.report is false => Budgets/Goals/Recurring blocked for Free
    'finance.report': false,
    'report.export': false,
    'finance.ai_advice': false,
  } as Record<string, boolean>,

  quotas: {
    // Personal quotas for Free
    'personal.accounts.max': 2,
    'personal.categories.max': 30,
    'personal.tags.max': 10,
    'personal.transactions.monthly': 200,
    'personal.recurring_rules.max': 0,
    'personal.attachments.max': 0,
  } as Record<string, number>,
};
