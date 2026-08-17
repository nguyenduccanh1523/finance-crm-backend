import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cover the organization/date/status filters used by the CRM dashboard. */
export class AddBusinessDashboardIndexes1779001000000 implements MigrationInterface {
  name = 'AddBusinessDashboardIndexes1779001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_tasks_org_due"
       ON "tasks" ("org_id", "due_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_tasks_org_status"
       ON "tasks" ("org_id", "status_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_customers_org_created"
       ON "crm_customers" ("org_id", "created_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_invoices_org_currency_issue"
       ON "invoices" ("org_id", "currency", "issue_date") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_invoice_payments_paid"
       ON "invoice_payments" ("paid_at", "invoice_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_activities_org_time_type"
       ON "crm_activities" ("org_id", "occurred_at", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dashboard_timesheets_org_date_status"
       ON "timesheet_entries" ("org_id", "work_date", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_dashboard_timesheets_org_date_status',
      'IDX_dashboard_activities_org_time_type',
      'IDX_dashboard_invoice_payments_paid',
      'IDX_dashboard_invoices_org_currency_issue',
      'IDX_dashboard_customers_org_created',
      'IDX_dashboard_tasks_org_status',
      'IDX_dashboard_tasks_org_due',
    ];
    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }
  }
}
