import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullWorkspaceCategoryTag1773369317930 implements MigrationInterface {
  name = 'NullWorkspaceCategoryTag1773369317930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad1ab75c61b48c98b3072c8c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "workspace_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9314fe33e6d22aad5125f05b77"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ALTER COLUMN "workspace_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ad1ab75c61b48c98b3072c8c35" ON "categories" ("workspace_id", "name", "kind") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9314fe33e6d22aad5125f05b77" ON "tags" ("workspace_id", "name") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9314fe33e6d22aad5125f05b77"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad1ab75c61b48c98b3072c8c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ALTER COLUMN "workspace_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9314fe33e6d22aad5125f05b77" ON "tags" ("name", "workspace_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "workspace_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ad1ab75c61b48c98b3072c8c35" ON "categories" ("kind", "name", "workspace_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
  }
}
