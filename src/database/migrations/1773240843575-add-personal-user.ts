import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalUser1773240843575 implements MigrationInterface {
  name = 'AddPersonalUser1773240843575';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personal_workspaces" DROP CONSTRAINT "FK_e467349b33783a429a023401aff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_workspaces" DROP COLUMN "userId"`,
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
      `ALTER TABLE "personal_workspaces" ADD CONSTRAINT "FK_b8e37264234af34767c09d2263c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personal_workspaces" DROP CONSTRAINT "FK_b8e37264234af34767c09d2263c"`,
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
      `ALTER TABLE "personal_workspaces" ADD "userId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_workspaces" ADD CONSTRAINT "FK_e467349b33783a429a023401aff" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
