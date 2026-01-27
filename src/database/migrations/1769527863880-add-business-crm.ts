import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessCrm1769527863880 implements MigrationInterface {
    name = 'AddBusinessCrm1769527863880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "work_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "name" character varying NOT NULL, "billable" boolean NOT NULL DEFAULT true, "color" character varying, CONSTRAINT "PK_629764f4f43f08b045de838bedd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e66039de1a448072ce20b5caf8" ON "work_types" ("org_id", "name") `);
        await queryRunner.query(`CREATE TABLE "timesheet_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "project_id" uuid, "task_id" uuid, "work_type_id" uuid NOT NULL, "minutes" integer NOT NULL, "work_date" date NOT NULL, "description" character varying, "status" character varying NOT NULL, "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_25a8a9b6a96e72864d598563c56" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ccfda7fa789e78823a961484c3" ON "timesheet_entries" ("org_id", "work_date") `);
        await queryRunner.query(`CREATE TABLE "statuses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "entity_type" text NOT NULL, "name" character varying NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_done" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2fd3770acdb67736f1a3e3d5399" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_53c2f8acf3371865f64d749e76" ON "statuses" ("org_id", "entity_type", "name") `);
        await queryRunner.query(`CREATE TABLE "attendance_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "check_in" TIMESTAMP WITH TIME ZONE NOT NULL, "check_out" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL, "note" character varying, CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e2f2a10a31438f493f61234d5d" ON "attendance_records" ("org_id") `);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "project_id" uuid NOT NULL, "title" character varying NOT NULL, "description" character varying, "status_id" uuid NOT NULL, "work_type_id" uuid NOT NULL, "priority" integer NOT NULL DEFAULT '0', "due_at" TIMESTAMP WITH TIME ZONE, "estimate_minutes" integer, "actual_minutes" integer NOT NULL DEFAULT '0', "created_by" uuid NOT NULL, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_18bfef29618a4a966e7ec06c07" ON "tasks" ("org_id", "status_id", "due_at") `);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "status_id" uuid NOT NULL, "owner_membership_id" uuid NOT NULL, "budget_cents" bigint, "currency" character(3) NOT NULL, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b2ff1128d9226cd209f0b518e1" ON "projects" ("org_id", "status_id") `);
        await queryRunner.query(`CREATE TABLE "task_assignees" ("task_id" uuid NOT NULL, "membership_id" uuid NOT NULL, CONSTRAINT "PK_9d1cf1bca17afbe5d404ba8786c" PRIMARY KEY ("task_id", "membership_id"))`);
        await queryRunner.query(`CREATE TABLE "project_members" ("project_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "project_role" text, CONSTRAINT "PK_97350909055a4b2449ecf6094f3" PRIMARY KEY ("project_id", "membership_id"))`);
        await queryRunner.query(`CREATE TABLE "org_expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "amount_cents" bigint NOT NULL, "currency" character(3) NOT NULL, "category" character varying NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "note" character varying, "project_id" uuid, "created_by" uuid NOT NULL, CONSTRAINT "PK_29afc8c51cbe92bc8f1bbb94d93" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98e63729474635321d7bb92555" ON "org_expenses" ("org_id", "occurred_at") `);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "number" character varying NOT NULL, "issue_date" date NOT NULL, "due_date" date NOT NULL, "status_id" uuid NOT NULL, "subtotal_cents" bigint NOT NULL, "tax_cents" bigint NOT NULL DEFAULT '0', "total_cents" bigint NOT NULL, "currency" character(3) NOT NULL, CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fbf3a4db81fefd0d81a98a16cd" ON "invoices" ("org_id", "number") `);
        await queryRunner.query(`CREATE TABLE "invoice_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "amount_cents" bigint NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "method" character varying NOT NULL, "reference" character varying, CONSTRAINT "PK_e19c9ebfa432289f510de7b4e99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoice_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "name" character varying NOT NULL, "qty" integer NOT NULL, "unit_price_cents" bigint NOT NULL, "amount_cents" bigint NOT NULL, "task_id" uuid, CONSTRAINT "PK_53b99f9e0e2945e69de1a12b75a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "crm_customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "name" character varying NOT NULL, "type" text NOT NULL, "industry" character varying, "website" character varying, "phone" character varying, "email" character varying, "address" character varying, "stage" character varying NOT NULL, "owner_membership_id" uuid NOT NULL, "organizationId" uuid, "ownerId" uuid, CONSTRAINT "PK_61db60e1d4f435fa46e87751c7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d55172f66daffde1383bbd945" ON "crm_customers" ("org_id", "stage") `);
        await queryRunner.query(`CREATE TABLE "crm_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "fullName" character varying NOT NULL, "title" character varying, "phone" character varying, "email" character varying, "notes" character varying, "customerId" uuid, CONSTRAINT "PK_bb46ecfcdfc9e97ef0df2905d14" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_73ddc5a7db8c3edb2d25060f84" ON "crm_contacts" ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "emails" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "direction" character varying NOT NULL, "from_email" character varying NOT NULL, "to_emails" jsonb NOT NULL, "cc_emails" jsonb, "subject" character varying NOT NULL, "body" character varying NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL, "provider_msg_id" character varying, CONSTRAINT "PK_a54dcebef8d05dca7e839749571" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_39e1d2bc47ba2a2178a72b0194" ON "emails" ("org_id", "sent_at") `);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid, "type" character varying NOT NULL, "params" jsonb NOT NULL, "file_url" character varying NOT NULL, "generated_by_user_id" uuid NOT NULL, "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_949dfcd08a010de4d46dde8f75" ON "reports" ("org_id", "generated_at") `);
        await queryRunner.query(`CREATE TABLE "crm_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "contact_id" uuid, "type" character varying NOT NULL, "summary" character varying NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_by_membership_id" uuid NOT NULL, CONSTRAINT "PK_d56ffe80fd59fb40765d9f6ff35" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_10144a1526c09c82dcbada6997" ON "crm_activities" ("customer_id", "occurred_at") `);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying, "created_by" uuid NOT NULL, CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "sender_membership_id" uuid NOT NULL, "body" character varying NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5dc244350d4aeea419f28acb07" ON "messages" ("conversation_id", "sent_at") `);
        await queryRunner.query(`CREATE TABLE "conversation_members" ("conversation_id" uuid NOT NULL, "membership_id" uuid NOT NULL, CONSTRAINT "PK_44f9efc7918b607fc65aeaf5b02" PRIMARY KEY ("conversation_id", "membership_id"))`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_65e6d0ed62450b63ddec0b7d8bc" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crm_customers" ADD CONSTRAINT "FK_7762709e9adbead61a326b456c2" FOREIGN KEY ("ownerId") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crm_contacts" ADD CONSTRAINT "FK_1b84f1e1aa725586ab737bb0d84" FOREIGN KEY ("customerId") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_contacts" DROP CONSTRAINT "FK_1b84f1e1aa725586ab737bb0d84"`);
        await queryRunner.query(`ALTER TABLE "crm_customers" DROP CONSTRAINT "FK_7762709e9adbead61a326b456c2"`);
        await queryRunner.query(`ALTER TABLE "crm_customers" DROP CONSTRAINT "FK_65e6d0ed62450b63ddec0b7d8bc"`);
        await queryRunner.query(`ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TABLE "conversation_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5dc244350d4aeea419f28acb07"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10144a1526c09c82dcbada6997"`);
        await queryRunner.query(`DROP TABLE "crm_activities"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_949dfcd08a010de4d46dde8f75"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39e1d2bc47ba2a2178a72b0194"`);
        await queryRunner.query(`DROP TABLE "emails"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73ddc5a7db8c3edb2d25060f84"`);
        await queryRunner.query(`DROP TABLE "crm_contacts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d55172f66daffde1383bbd945"`);
        await queryRunner.query(`DROP TABLE "crm_customers"`);
        await queryRunner.query(`DROP TABLE "invoice_items"`);
        await queryRunner.query(`DROP TABLE "invoice_payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fbf3a4db81fefd0d81a98a16cd"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98e63729474635321d7bb92555"`);
        await queryRunner.query(`DROP TABLE "org_expenses"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TABLE "task_assignees"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2ff1128d9226cd209f0b518e1"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18bfef29618a4a966e7ec06c07"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2f2a10a31438f493f61234d5d"`);
        await queryRunner.query(`DROP TABLE "attendance_records"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53c2f8acf3371865f64d749e76"`);
        await queryRunner.query(`DROP TABLE "statuses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ccfda7fa789e78823a961484c3"`);
        await queryRunner.query(`DROP TABLE "timesheet_entries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e66039de1a448072ce20b5caf8"`);
        await queryRunner.query(`DROP TABLE "work_types"`);
    }

}
