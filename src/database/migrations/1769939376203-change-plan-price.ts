import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangePlanPrice1769939376203 implements MigrationInterface {
  name = 'ChangePlanPrice1769939376203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "monthly_price_cents" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "yearly_price_cents" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "price_cents" SET DEFAULT '0'`,
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
      `ALTER TABLE "plans" ALTER COLUMN "price_cents" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN "yearly_price_cents"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN "monthly_price_cents"`,
    );
  }
}
