import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fast, organization-scoped substring search for the high-volume business lists.
 * pg_trgm is deliberately used because ILIKE '%term%' cannot use a normal btree index.
 */
export class AddBusinessSearchIndexes1779000000000 implements MigrationInterface {
  name = 'AddBusinessSearchIndexes1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    // Operator classes belong after the column, not inside an extra expression
    // pair such as (("name" gin_trgm_ops)), which is invalid PostgreSQL syntax.
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_crm_customers_org_name_trgm" ON "crm_customers" USING GIN ("name" gin_trgm_ops) WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_crm_contacts_full_name_trgm" ON "crm_contacts" USING GIN ("fullName" gin_trgm_ops) WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_projects_name_trgm" ON "projects" USING GIN ("name" gin_trgm_ops) WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_tasks_title_trgm" ON "tasks" USING GIN ("title" gin_trgm_ops) WHERE "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_messages_body_trgm" ON "messages" USING GIN ("body" gin_trgm_ops)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_emails_subject_trgm" ON "emails" USING GIN ("subject" gin_trgm_ops)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [
      'IDX_emails_subject_trgm',
      'IDX_messages_body_trgm',
      'IDX_tasks_title_trgm',
      'IDX_projects_name_trgm',
      'IDX_crm_contacts_full_name_trgm',
      'IDX_crm_customers_org_name_trgm',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }
  }
}
