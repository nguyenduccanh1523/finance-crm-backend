import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeRefreshToken1769613580070 implements MigrationInterface {
  name = 'ChangeRefreshToken1769613580070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "userId" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
