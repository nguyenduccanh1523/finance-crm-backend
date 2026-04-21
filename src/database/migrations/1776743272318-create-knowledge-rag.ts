import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeRag1776743272318 implements MigrationInterface {
  name = 'CreateKnowledgeRag1776743272318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_goal_unique_by_account"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_budget_unique_by_account"`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "task_order" integer NOT NULL, "task_type" character varying NOT NULL, "agent_name" character varying NOT NULL, "queue_name" character varying NOT NULL, "routing_key" character varying NOT NULL, "depends_on_task_ids" jsonb NOT NULL DEFAULT '[]'::jsonb, "input_payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" character varying NOT NULL, "attempt_count" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '3', "timeout_seconds" integer NOT NULL DEFAULT '60', "cost_budget_cents" integer, "confidence_threshold" numeric(5,4), "visibility_scope" text, "assigned_worker" text, "locked_at" TIMESTAMP WITH TIME ZONE, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "output_payload" jsonb, "error_code" text, "error_message" text, CONSTRAINT "PK_702a80959e8b659ab50fb64938a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_name" character varying NOT NULL, "workflow_version" character varying NOT NULL DEFAULT 'v1', "scope_type" character varying NOT NULL, "workspace_id" uuid, "org_id" uuid, "requested_by_user_id" uuid, "trigger_source" character varying NOT NULL, "trigger_event" text, "request_payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "planning_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" character varying NOT NULL, "priority" integer NOT NULL DEFAULT '5', "idempotency_key" text, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "error_code" text, "error_message" text, CONSTRAINT "PK_eea9f8d0a660b3f48114c313233" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tool_call_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "workflow_task_id" uuid NOT NULL, "agent_run_id" uuid, "tool_name" character varying NOT NULL, "tool_provider" character varying NOT NULL DEFAULT 'archestra', "request_payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "response_payload" jsonb, "status" character varying NOT NULL, "latency_ms" integer, "token_usage" jsonb, "cost_cents" integer, "confidence_score" numeric(5,4), "blocked_reason" text, "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_bc40b685c4ed8d061b30c61335b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "source_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "workflow_task_id" uuid, "agent_run_id" uuid, "source_type" character varying NOT NULL, "source_uri" text, "source_ref" text, "title" text, "content" jsonb NOT NULL DEFAULT '{}'::jsonb, "visibility_scope" text, CONSTRAINT "PK_66c8b408e6c29ccbd566862abe4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "signals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "signal_name" character varying NOT NULL, "signal_value" character varying NOT NULL, "score" numeric(8,4), "confidence_score" numeric(5,4), "explanation" text, "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_04eeac09c09b65bc55c628c101d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "observations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "workflow_task_id" uuid, "observation_type" character varying NOT NULL, "observation_key" character varying NOT NULL, "value_json" jsonb NOT NULL, "confidence_score" numeric(5,4), "source_record_ids" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "PK_f9208d64f50a76030758087c0ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_chunks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "workspace_id" uuid NOT NULL, "chunk_index" integer NOT NULL, "content" text NOT NULL, "token_count" integer NOT NULL DEFAULT '0', "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "embedding" vector(384), "content_tsv" tsvector, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_81af684d79d321813c41019a5cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_39f081dc13b1fdd4ee177ac677" ON "knowledge_chunks" ("workspace_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_47fa8af657e1aa62ea10aa1683" ON "knowledge_chunks" ("document_id", "chunk_index") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fdb0326b2788c2502087ecf87" ON "knowledge_chunks" ("workspace_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspace_id" uuid NOT NULL, "source_type" text NOT NULL, "source_ref" text NOT NULL, "title" text, "raw_text" text NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" text NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "PK_402a3c43fb263aa5289670e4e21" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a7dc258bb8a948dc3ad02045c" ON "knowledge_documents" ("workspace_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b3e00dd98e1db818838e4ebd25" ON "knowledge_documents" ("workspace_id", "source_type", "source_ref") `,
    );
    await queryRunner.query(
      `CREATE TABLE "assertions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "workflow_task_id" uuid, "assertion_type" character varying NOT NULL, "assertion_text" text NOT NULL, "severity" text, "confidence_score" numeric(5,4), "source_record_ids" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "PK_512d11ffbf6d085b59941102ede" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workflow_run_id" uuid NOT NULL, "workflow_task_id" uuid NOT NULL, "workspace_id" uuid, "org_id" uuid, "agent_name" character varying NOT NULL, "status" character varying NOT NULL, "context_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "result_json" jsonb, "metrics_json" jsonb, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_442f7e0ec4ae860cf17edc57825" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "direction"`);
    await queryRunner.query(
      `CREATE TYPE "public"."emails_direction_enum" AS ENUM('IN', 'OUT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "emails" ADD "direction" "public"."emails_direction_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_type_enum" AS ENUM('DM', 'GROUP')`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "type" "public"."conversations_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c173af9839a0a1956046c13f3e" ON "budgets" ("workspace_id", "account_id", "period_month", "category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_2089ee83745a2f45c4f97faf2a5" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_content_tsv_gin"
        ON "knowledge_chunks"
        USING GIN ("content_tsv")
    `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_embedding_hnsw"
        ON "knowledge_chunks"
        USING hnsw ("embedding" vector_cosine_ops)
    `);

    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION knowledge_chunks_tsv_trigger_fn()
        RETURNS trigger AS $$
        BEGIN
            NEW.content_tsv := to_tsvector('simple', COALESCE(NEW.content, ''));
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_knowledge_chunks_tsv_update ON "knowledge_chunks"
    `);

    await queryRunner.query(`
        CREATE TRIGGER trg_knowledge_chunks_tsv_update
        BEFORE INSERT OR UPDATE OF "content"
        ON "knowledge_chunks"
        FOR EACH ROW
        EXECUTE FUNCTION knowledge_chunks_tsv_trigger_fn()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_2089ee83745a2f45c4f97faf2a5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c173af9839a0a1956046c13f3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "raw_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."conversations_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "type" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "direction"`);
    await queryRunner.query(`DROP TYPE "public"."emails_direction_enum"`);
    await queryRunner.query(
      `ALTER TABLE "emails" ADD "direction" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP TABLE "agent_runs"`);
    await queryRunner.query(`DROP TABLE "assertions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3e00dd98e1db818838e4ebd25"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a7dc258bb8a948dc3ad02045c"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fdb0326b2788c2502087ecf87"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_47fa8af657e1aa62ea10aa1683"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39f081dc13b1fdd4ee177ac677"`,
    );
    await queryRunner.query(`
    DROP TRIGGER IF EXISTS trg_knowledge_chunks_tsv_update ON "knowledge_chunks"
    `);

    await queryRunner.query(`
    DROP FUNCTION IF EXISTS knowledge_chunks_tsv_trigger_fn
    `);

    await queryRunner.query(`
    DROP INDEX IF EXISTS "public"."IDX_knowledge_chunks_embedding_hnsw"
    `);

    await queryRunner.query(`
    DROP INDEX IF EXISTS "public"."IDX_knowledge_chunks_content_tsv_gin"
    `);
    await queryRunner.query(`DROP TABLE "knowledge_chunks"`);
    await queryRunner.query(`DROP TABLE "observations"`);
    await queryRunner.query(`DROP TABLE "signals"`);
    await queryRunner.query(`DROP TABLE "source_records"`);
    await queryRunner.query(`DROP TABLE "tool_call_logs"`);
    await queryRunner.query(`DROP TABLE "workflow_runs"`);
    await queryRunner.query(`DROP TABLE "workflow_tasks"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_budget_unique_by_account" ON "budgets" ("account_id", "category_id", "period_month", "workspace_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_goal_unique_by_account" ON "goals" ("account_id", "target_date", "workspace_id") `,
    );
  }
}
