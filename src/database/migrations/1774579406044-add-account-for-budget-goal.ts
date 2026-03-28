import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountForBudgetGoal1774579406044 implements MigrationInterface {
  name = 'AddAccountForBudgetGoal1774579406044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exchange_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspace_id" uuid NOT NULL, "from_currency" character(3) NOT NULL, "to_currency" character(3) NOT NULL, "rate" numeric(18,8) NOT NULL, "base_currency" character(3) NOT NULL DEFAULT 'VND', "workspaceId" uuid, CONSTRAINT "PK_33a614bad9e61956079d817ebe2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4175ab794df3193d7e7426a488" ON "exchange_rates" ("workspace_id", "from_currency", "to_currency") `,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ADD "account_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ADD "currency" character(3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD "account_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD "currency" character(3) NOT NULL`,
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
      `CREATE INDEX "IDX_ef438d885c2e3bf42bb191af74" ON "goals" ("account_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08e12ed853dff5bbc38849cf7f" ON "budgets" ("account_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ADD CONSTRAINT "FK_ef438d885c2e3bf42bb191af743" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_rates" ADD CONSTRAINT "FK_f96e00dd995d7592e364fb54874" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_08e12ed853dff5bbc38849cf7f4" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budgets" DROP CONSTRAINT "FK_08e12ed853dff5bbc38849cf7f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_rates" DROP CONSTRAINT "FK_f96e00dd995d7592e364fb54874"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" DROP CONSTRAINT "FK_ef438d885c2e3bf42bb191af743"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08e12ed853dff5bbc38849cf7f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef438d885c2e3bf42bb191af74"`,
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
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "account_id"`);
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "account_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4175ab794df3193d7e7426a488"`,
    );
    await queryRunner.query(`DROP TABLE "exchange_rates"`);
  }
}
