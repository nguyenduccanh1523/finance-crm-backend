import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The original schema accidentally created two creator columns on
 * `organizations`: `created_by` and TypeORM's implicit `createdById`.
 * The entity now explicitly joins its relation through `created_by`, so the
 * legacy duplicate must be removed before inserts can rely on the canonical
 * column alone.
 */
export class FixOrganizationCreatedByRelation1779002000000
  implements MigrationInterface
{
  name = 'FixOrganizationCreatedByRelation1779002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "FK_3a7ce4d98134ccb1d56a30e72be"',
    );
    await queryRunner.query(
      'ALTER TABLE "organizations" DROP COLUMN IF EXISTS "createdById"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "createdById" uuid',
    );
    await queryRunner.query(
      'UPDATE "organizations" SET "createdById" = "created_by" WHERE "createdById" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "organizations" ALTER COLUMN "createdById" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "organizations" ADD CONSTRAINT "FK_3a7ce4d98134ccb1d56a30e72be" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }
}
