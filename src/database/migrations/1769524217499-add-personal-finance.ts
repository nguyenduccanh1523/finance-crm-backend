import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPersonalFinance1769524217499 implements MigrationInterface {
    name = 'AddPersonalFinance1769524217499'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "personal_workspaces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "timezone" text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', "default_currency" character(3) NOT NULL DEFAULT 'VND', "userId" uuid, CONSTRAINT "UQ_b8e37264234af34767c09d2263c" UNIQUE ("user_id"), CONSTRAINT "PK_d06623f7d2017be79231050faf7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b8e37264234af34767c09d2263" ON "personal_workspaces" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "currency" character(3) NOT NULL, "opening_balance_cents" bigint NOT NULL DEFAULT '0', "current_balance_cents" bigint NOT NULL DEFAULT '0', "workspaceId" uuid, CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_212b65ba4b65c8c6d2619f3681" ON "accounts" ("workspace_id") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "name" text NOT NULL, "kind" text NOT NULL, "parent_id" uuid, "icon" text, "sort_order" integer NOT NULL DEFAULT '0', "workspaceId" uuid, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ad1ab75c61b48c98b3072c8c35" ON "categories" ("workspace_id", "name", "kind") `);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "account_id" uuid NOT NULL, "type" text NOT NULL, "amount_cents" bigint NOT NULL, "currency" character(3) NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "category_id" uuid, "note" text, "counterparty" text, "transfer_account_id" uuid, "workspaceId" uuid, "accountId" uuid, "categoryId" uuid, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97ff86c4b451237920f18c5421" ON "transactions" ("occurred_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_ae57965859a62584e984de94f5" ON "transactions" ("workspace_id", "occurred_at") `);
        await queryRunner.query(`CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "name" text NOT NULL, "color" text, "workspaceId" uuid, CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9314fe33e6d22aad5125f05b77" ON "tags" ("workspace_id", "name") `);
        await queryRunner.query(`CREATE TABLE "transaction_tags" ("transaction_id" uuid NOT NULL, "tag_id" uuid NOT NULL, "transactionId" uuid, "tagId" uuid, CONSTRAINT "PK_5f99821bd8651353d06674e2c4d" PRIMARY KEY ("transaction_id", "tag_id"))`);
        await queryRunner.query(`CREATE TABLE "recurring_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "type" text NOT NULL, "amount_cents" bigint NOT NULL, "currency" character(3) NOT NULL, "rrule" text NOT NULL, "next_run_at" TIMESTAMP WITH TIME ZONE NOT NULL, "end_at" TIMESTAMP WITH TIME ZONE, "workspaceId" uuid, CONSTRAINT "PK_22942a1b99033aea3a8bc8f9e8d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_13f57c7f54bda72d26dfc717d9" ON "recurring_rules" ("next_run_at") `);
        await queryRunner.query(`CREATE TABLE "goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "workspace_id" uuid NOT NULL, "name" text NOT NULL, "target_amount_cents" bigint NOT NULL, "target_date" date NOT NULL, "current_amount_cents" bigint NOT NULL DEFAULT '0', "status" text NOT NULL, "workspaceId" uuid, CONSTRAINT "PK_26e17b251afab35580dff769223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspace_id" uuid NOT NULL, "period_month" date NOT NULL, "category_id" uuid, "amount_limit_cents" bigint NOT NULL, "alert_threshold_percent" integer NOT NULL DEFAULT '80', "workspaceId" uuid, CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c173af9839a0a1956046c13f3e" ON "budgets" ("workspace_id", "period_month", "category_id") `);
        await queryRunner.query(`CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "owner_type" text NOT NULL, "owner_id" uuid NOT NULL, "file_url" text NOT NULL, "mime" text NOT NULL, "size_bytes" bigint NOT NULL, CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3cb0098f75e9626de69809f5ba" ON "attachments" ("owner_type", "owner_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "personal_workspaces" ADD CONSTRAINT "FK_e467349b33783a429a023401aff" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_11215cbfeb832cd5fc67664d033" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_0976b1d3fadea3a8d436a96a8be" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_9b55a8ef5fdf298a3f73cec5928" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tags" ADD CONSTRAINT "FK_d31ad143044deb9e8e8a19a72f0" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_tags" ADD CONSTRAINT "FK_23ed9c8ca2e4b5cf639c580e50b" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_tags" ADD CONSTRAINT "FK_ccbbef396290acaece98cb129b6" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_rules" ADD CONSTRAINT "FK_804c37c0f3ecd70fc92aaf74e9a" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_5b360bad0ef50ba16c4c09b3a43" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_73c8420e703346ef3044de9d9f9" FOREIGN KEY ("workspaceId") REFERENCES "personal_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_73c8420e703346ef3044de9d9f9"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_5b360bad0ef50ba16c4c09b3a43"`);
        await queryRunner.query(`ALTER TABLE "recurring_rules" DROP CONSTRAINT "FK_804c37c0f3ecd70fc92aaf74e9a"`);
        await queryRunner.query(`ALTER TABLE "transaction_tags" DROP CONSTRAINT "FK_ccbbef396290acaece98cb129b6"`);
        await queryRunner.query(`ALTER TABLE "transaction_tags" DROP CONSTRAINT "FK_23ed9c8ca2e4b5cf639c580e50b"`);
        await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_d31ad143044deb9e8e8a19a72f0"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_9b55a8ef5fdf298a3f73cec5928"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_0976b1d3fadea3a8d436a96a8be"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_11215cbfeb832cd5fc67664d033"`);
        await queryRunner.query(`ALTER TABLE "personal_workspaces" DROP CONSTRAINT "FK_e467349b33783a429a023401aff"`);
        await queryRunner.query(`ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3cb0098f75e9626de69809f5ba"`);
        await queryRunner.query(`DROP TABLE "attachments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c173af9839a0a1956046c13f3e"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TABLE "goals"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13f57c7f54bda72d26dfc717d9"`);
        await queryRunner.query(`DROP TABLE "recurring_rules"`);
        await queryRunner.query(`DROP TABLE "transaction_tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9314fe33e6d22aad5125f05b77"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae57965859a62584e984de94f5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97ff86c4b451237920f18c5421"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad1ab75c61b48c98b3072c8c35"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_212b65ba4b65c8c6d2619f3681"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8e37264234af34767c09d2263"`);
        await queryRunner.query(`DROP TABLE "personal_workspaces"`);
    }

}
