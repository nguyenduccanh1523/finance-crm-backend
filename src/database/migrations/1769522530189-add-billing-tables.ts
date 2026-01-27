import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillingTables1769522530189 implements MigrationInterface {
    name = 'AddBillingTables1769522530189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" text NOT NULL, "name" text NOT NULL, "interval" text NOT NULL, "price_cents" integer NOT NULL, "currency" character(3) NOT NULL, "features" jsonb NOT NULL DEFAULT '{}'::jsonb, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_95f7ef3fc4c31a3545b4d825dd4" UNIQUE ("code"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_95f7ef3fc4c31a3545b4d825dd" ON "plans" ("code") `);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "scope" text NOT NULL, "user_id" uuid, "org_id" uuid, "plan_id" uuid NOT NULL, "status" text NOT NULL, "provider" text NOT NULL, "external_subscription_id" text, "period_start" TIMESTAMP WITH TIME ZONE, "period_end" TIMESTAMP WITH TIME ZONE, "cancel_at_period_end" boolean NOT NULL DEFAULT false, "canceled_at" TIMESTAMP WITH TIME ZONE, "userId" uuid, "organizationId" uuid, "planId" uuid, CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6ccf973355b70645eff37774de" ON "subscriptions" ("status") `);
        await queryRunner.query(`CREATE TABLE "payment_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscription_id" uuid NOT NULL, "provider" text NOT NULL, "amount_cents" integer NOT NULL, "currency" character(3) NOT NULL, "status" text NOT NULL, "external_payment_id" text, "external_invoice_id" text, "paid_at" TIMESTAMP WITH TIME ZONE, "failure_reason" text, "raw_payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "subscriptionId" uuid, CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b1cce046bbbe7f64dc05e6e86" ON "payment_transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2f5c372e73a8ae76d34063c40" ON "payment_transactions" ("external_payment_id") `);
        await queryRunner.query(`CREATE TABLE "payment_provider_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "provider" text NOT NULL, "event_id" text NOT NULL, "event_type" text NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processed_at" TIMESTAMP WITH TIME ZONE, "payload" jsonb NOT NULL, CONSTRAINT "PK_e94b23836002f2a07a3046ed2e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_02c8fe02296db67be730f85af9" ON "payment_provider_events" ("provider", "event_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_a7a84c705f3e8e4fbd497cfb119" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_7536cba909dd7584a4640cad7d5" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_aa196798389ceee121dc76cfaaf" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_aa196798389ceee121dc76cfaaf"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_7536cba909dd7584a4640cad7d5"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_a7a84c705f3e8e4fbd497cfb119"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02c8fe02296db67be730f85af9"`);
        await queryRunner.query(`DROP TABLE "payment_provider_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2f5c372e73a8ae76d34063c40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b1cce046bbbe7f64dc05e6e86"`);
        await queryRunner.query(`DROP TABLE "payment_transactions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ccf973355b70645eff37774de"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95f7ef3fc4c31a3545b4d825dd"`);
        await queryRunner.query(`DROP TABLE "plans"`);
    }

}
