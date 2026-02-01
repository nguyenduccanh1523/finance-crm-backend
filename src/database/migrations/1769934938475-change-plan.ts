import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangePlan1769934938475 implements MigrationInterface {
  name = 'ChangePlan1769934938475';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" ADD "stripe_product_id" text`);
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "stripe_monthly_price_id" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "stripe_yearly_price_id" text`,
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
      `ALTER TABLE "plans" DROP COLUMN "stripe_yearly_price_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN "stripe_monthly_price_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN "stripe_product_id"`,
    );
  }
}
