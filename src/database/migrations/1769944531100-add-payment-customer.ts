import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCustomer1769944531100 implements MigrationInterface {
  name = 'AddPaymentCustomer1769944531100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "provider" text NOT NULL, "scope" text NOT NULL, "user_id" uuid, "org_id" uuid, "external_customer_id" text NOT NULL, CONSTRAINT "PK_e7abeb831f94d053cf4f3f20d80" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_be8ed1d6e0a6c4b6a4c9bf2c52" ON "payment_customers" ("provider", "scope", "user_id", "org_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be8ed1d6e0a6c4b6a4c9bf2c52"`,
    );
    await queryRunner.query(`DROP TABLE "payment_customers"`);
  }
}
