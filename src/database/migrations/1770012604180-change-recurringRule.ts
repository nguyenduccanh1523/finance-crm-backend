import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeRecurringRule1770012604180 implements MigrationInterface {
  name = 'ChangeRecurringRule1770012604180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD "account_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD "category_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD "accountId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD "categoryId" uuid`,
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
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD CONSTRAINT "FK_09eb547dec35cfb2b8959b931d6" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" ADD CONSTRAINT "FK_58453c7044d0b990f1a23d88be9" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" DROP CONSTRAINT "FK_58453c7044d0b990f1a23d88be9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" DROP CONSTRAINT "FK_09eb547dec35cfb2b8959b931d6"`,
    );
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
      `ALTER TABLE "recurring_rules" DROP COLUMN "categoryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" DROP COLUMN "accountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_rules" DROP COLUMN "account_id"`,
    );
  }
}
