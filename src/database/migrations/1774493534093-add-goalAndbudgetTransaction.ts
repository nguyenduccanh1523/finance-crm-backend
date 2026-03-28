import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoalAndbudgetTransaction1774493534093 implements MigrationInterface {
  name = 'AddGoalAndbudgetTransaction1774493534093';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`,
    );
    await queryRunner.query(
      `CREATE TABLE "goal_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "goal_id" uuid NOT NULL, "transaction_id" uuid NOT NULL, "type" text NOT NULL, "amount_cents" bigint NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "note" text, CONSTRAINT "PK_d386c7224d1406d4f77d3ae5107" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3361230e0fea57b40169d40776" ON "goal_transactions" ("goal_id", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db9411a1d1a31851b4f9e7d8f0" ON "goal_transactions" ("transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1bd8f936322a532c7dd95f8980" ON "goal_transactions" ("goal_id", "recorded_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "budget_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "budget_id" uuid NOT NULL, "transaction_id" uuid NOT NULL, "amount_cents" bigint NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6e2f01dd5b7b93585ed12444943" UNIQUE ("budget_id", "transaction_id"), CONSTRAINT "PK_31ac84aae9de19608a7d00b9bc5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1dfeb02021ea7e97649a090e39" ON "budget_transactions" ("transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_285af16b40a4b35230234a46b1" ON "budget_transactions" ("budget_id", "recorded_at") `,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "roleId"`);
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "userId"`);
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
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goal_transactions" ADD CONSTRAINT "FK_9019c460ba96707d2dcfdf314ce" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goal_transactions" ADD CONSTRAINT "FK_db9411a1d1a31851b4f9e7d8f00" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_transactions" ADD CONSTRAINT "FK_1efbffe7759c49b3955b6fa12d8" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_transactions" ADD CONSTRAINT "FK_1dfeb02021ea7e97649a090e39c" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget_transactions" DROP CONSTRAINT "FK_1dfeb02021ea7e97649a090e39c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_transactions" DROP CONSTRAINT "FK_1efbffe7759c49b3955b6fa12d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goal_transactions" DROP CONSTRAINT "FK_db9411a1d1a31851b4f9e7d8f00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goal_transactions" DROP CONSTRAINT "FK_9019c460ba96707d2dcfdf314ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
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
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "userId" uuid`);
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "roleId" uuid`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_285af16b40a4b35230234a46b1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1dfeb02021ea7e97649a090e39"`,
    );
    await queryRunner.query(`DROP TABLE "budget_transactions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1bd8f936322a532c7dd95f8980"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db9411a1d1a31851b4f9e7d8f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3361230e0fea57b40169d40776"`,
    );
    await queryRunner.query(`DROP TABLE "goal_transactions"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
