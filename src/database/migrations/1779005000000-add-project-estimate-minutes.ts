import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectEstimateMinutes1779005000000 implements MigrationInterface {
  name = 'AddProjectEstimateMinutes1779005000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "estimate_minutes" integer');
    await queryRunner.query('ALTER TABLE "projects" ADD CONSTRAINT "CHK_projects_estimate_minutes_nonnegative" CHECK ("estimate_minutes" IS NULL OR "estimate_minutes" >= 0)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "CHK_projects_estimate_minutes_nonnegative"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN IF EXISTS "estimate_minutes"');
  }
}
