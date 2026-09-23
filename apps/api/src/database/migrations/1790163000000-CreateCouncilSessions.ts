import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouncilSessions1790163000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "council_sessions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "plan" jsonb NOT NULL,
      "events" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "protocol" jsonb,
      "status" character varying(10) NOT NULL CHECK ("status" IN ('running', 'closed', 'failed')),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_council_sessions" PRIMARY KEY ("id")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "council_sessions"');
  }
}
