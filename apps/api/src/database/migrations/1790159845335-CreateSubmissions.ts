import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubmissions1790159845335 implements MigrationInterface {
  name = 'CreateSubmissions1790159845335';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamName" character varying(40) NOT NULL, "plan" jsonb NOT NULL, "score" double precision NOT NULL, "rank" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_10b3be95b8b2fb1e482e07d706b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_submissions_score" ON "submissions" ("score") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_submissions_score"`);
    await queryRunner.query(`DROP TABLE "submissions"`);
  }
}
