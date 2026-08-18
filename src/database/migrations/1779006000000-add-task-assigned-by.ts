import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssignedBy1779006000000 implements MigrationInterface {
  name = 'AddTaskAssignedBy1779006000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assigned_by" uuid');
    await queryRunner.query('UPDATE "tasks" SET "assigned_by" = "created_by" WHERE "assigned_by" IS NULL');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_tasks_assigned_by" ON "tasks" ("assigned_by")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tasks_assigned_by"');
    await queryRunner.query('ALTER TABLE "tasks" DROP COLUMN IF EXISTS "assigned_by"');
  }
}
