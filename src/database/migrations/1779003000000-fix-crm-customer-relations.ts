import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Uses the canonical organization and owner columns already present in the
 * CRM table. The initial migration also created nullable implicit relation
 * columns (`organizationId`, `ownerId`), which makes relation joins unreliable.
 */
export class FixCrmCustomerRelations1779003000000
  implements MigrationInterface
{
  name = 'FixCrmCustomerRelations1779003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "crm_customers" DROP CONSTRAINT IF EXISTS "FK_65e6d0ed62450b63ddec0b7d8bc"',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" DROP CONSTRAINT IF EXISTS "FK_7762709e9adbead61a326b456c2"',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" DROP COLUMN IF EXISTS "organizationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" DROP COLUMN IF EXISTS "ownerId"',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" ADD COLUMN IF NOT EXISTS "estimated_value_cents" bigint NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_crm_customers_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_crm_customers_owner_membership_id" FOREIGN KEY ("owner_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_crm_customers_org_owner_stage_created" ON "crm_customers" ("org_id", "owner_membership_id", "stage", "created_at" DESC) WHERE "deleted_at" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_crm_customers_org_owner_stage_created"');
    await queryRunner.query('ALTER TABLE "crm_customers" DROP CONSTRAINT IF EXISTS "FK_crm_customers_owner_membership_id"');
    await queryRunner.query('ALTER TABLE "crm_customers" DROP CONSTRAINT IF EXISTS "FK_crm_customers_org_id"');
    await queryRunner.query('ALTER TABLE "crm_customers" DROP COLUMN IF EXISTS "estimated_value_cents"');
    await queryRunner.query('ALTER TABLE "crm_customers" ADD COLUMN IF NOT EXISTS "organizationId" uuid');
    await queryRunner.query('ALTER TABLE "crm_customers" ADD COLUMN IF NOT EXISTS "ownerId" uuid');
    await queryRunner.query('ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_65e6d0ed62450b63ddec0b7d8bc" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_7762709e9adbead61a326b456c2" FOREIGN KEY ("ownerId") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
  }
}
