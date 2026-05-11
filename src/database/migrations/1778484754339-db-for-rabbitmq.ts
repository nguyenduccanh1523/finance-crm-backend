import { MigrationInterface, QueryRunner } from 'typeorm';

export class DbForRabbitmq1778484754339 implements MigrationInterface {
  name = 'DbForRabbitmq1778484754339';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c173af9839a0a1956046c13f3e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_knowledge_chunks_content_tsv_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_knowledge_chunks_embedding_hnsw"`,
    );
    await queryRunner.query(`ALTER TABLE "agent_runs" ADD "error_code" text`);
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD "error_message" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "result_json" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "metrics_json" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP COLUMN "agent_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD "agent_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "agent_runs" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD "status" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ALTER COLUMN "context_json" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "workflow_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "workflow_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "workflow_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "workflow_version" character varying(20) NOT NULL DEFAULT 'v1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "scope_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "scope_type" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "trigger_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "trigger_source" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ALTER COLUMN "request_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ALTER COLUMN "planning_snapshot" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_runs" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "status" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "task_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "task_type" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "agent_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "agent_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "queue_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "queue_name" character varying(150) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "routing_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "routing_key" character varying(150) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ALTER COLUMN "depends_on_task_ids" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ALTER COLUMN "input_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "status" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "confidence_threshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "confidence_threshold" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_call_logs" ALTER COLUMN "request_payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_records" ALTER COLUMN "content" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "signals" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "observations" ALTER COLUMN "source_record_ids" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_chunks" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_documents" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "assertions" ALTER COLUMN "source_record_ids" SET DEFAULT '[]'::jsonb`,
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
      `CREATE UNIQUE INDEX "IDX_05f7abf4e77c732c100a6d2dc1" ON "budgets" ("workspace_id", "account_id", "period_month", "category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_runs_agent_status" ON "agent_runs" ("agent_name", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_runs_workflow_task_id" ON "agent_runs" ("workflow_task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_runs_workflow_run_id" ON "agent_runs" ("workflow_run_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_runs_idempotency_key" ON "workflow_runs" ("idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_runs_org_status" ON "workflow_runs" ("org_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_runs_workspace_status" ON "workflow_runs" ("workspace_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_runs_status" ON "workflow_runs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_tasks_queue_status" ON "workflow_tasks" ("queue_name", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_tasks_status" ON "workflow_tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_tasks_run_order" ON "workflow_tasks" ("workflow_run_id", "task_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_tasks_run_id" ON "workflow_tasks" ("workflow_run_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD CONSTRAINT "FK_3d8f08e82186620dc7b61e904a1" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD CONSTRAINT "FK_208f865d37a0dafd409c4145a41" FOREIGN KEY ("workflow_task_id") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD CONSTRAINT "FK_134cc8e3005759ebefb581d6aa5" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP CONSTRAINT "FK_134cc8e3005759ebefb581d6aa5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP CONSTRAINT "FK_208f865d37a0dafd409c4145a41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP CONSTRAINT "FK_3d8f08e82186620dc7b61e904a1"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_workflow_tasks_run_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_workflow_tasks_run_order"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_workflow_tasks_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_workflow_tasks_queue_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_workflow_runs_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_workflow_runs_workspace_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_workflow_runs_org_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_workflow_runs_idempotency_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_agent_runs_workflow_run_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_agent_runs_workflow_task_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_agent_runs_agent_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_05f7abf4e77c732c100a6d2dc1"`,
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
      `ALTER TABLE "assertions" ALTER COLUMN "source_record_ids" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_documents" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_chunks" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "observations" ALTER COLUMN "source_record_ids" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "signals" ALTER COLUMN "payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_records" ALTER COLUMN "content" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_call_logs" ALTER COLUMN "request_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "confidence_threshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "confidence_threshold" numeric(5,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ALTER COLUMN "input_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ALTER COLUMN "depends_on_task_ids" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "routing_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "routing_key" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "queue_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "queue_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "agent_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "agent_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" DROP COLUMN "task_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD "task_type" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_runs" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ALTER COLUMN "planning_snapshot" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ALTER COLUMN "request_payload" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "trigger_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "trigger_source" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "scope_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "scope_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "workflow_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "workflow_version" character varying NOT NULL DEFAULT 'v1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "workflow_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" ADD "workflow_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ALTER COLUMN "context_json" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "agent_runs" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP COLUMN "agent_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" ADD "agent_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "metrics_json"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_runs" DROP COLUMN "result_json"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP COLUMN "error_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_runs" DROP COLUMN "error_code"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_chunks_embedding_hnsw" ON "knowledge_chunks" ("embedding") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_chunks_content_tsv_gin" ON "knowledge_chunks" ("content_tsv") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c173af9839a0a1956046c13f3e" ON "budgets" ("account_id", "category_id", "period_month", "workspace_id") `,
    );
  }
}
