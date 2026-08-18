import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkManagementIntegrity1779004000000 implements MigrationInterface {
  name = 'AddWorkManagementIntegrity1779004000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_tasks_org_project_updated" ON "tasks" ("org_id", "project_id", "updated_at" DESC) WHERE "deleted_at" IS NULL');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_timesheet_org_task_work_date" ON "timesheet_entries" ("org_id", "task_id", "work_date" DESC)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_project_members_membership" ON "project_members" ("membership_id")');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_project_members_membership"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_timesheet_org_task_work_date"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tasks_org_project_updated"');
  }
}
