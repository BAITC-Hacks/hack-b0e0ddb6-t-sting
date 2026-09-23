import type { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { CreateSubmissions1790159845335 } from '../../../src/database/migrations/1790159845335-CreateSubmissions';

describe('submissions migration', () => {
  it('creates persistent plans, precise scores, timestamps, and a score index', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const migration = new CreateSubmissions1790159845335();
    await migration.up({ query } as unknown as QueryRunner);
    expect(migration.name).toBe('CreateSubmissions1790159845335');
    expect(query).toHaveBeenCalledTimes(2);
    const schema = query.mock.calls[0][0] as string;
    expect(schema).toContain('CREATE TABLE "submissions"');
    expect(schema).toContain('"teamName" character varying(40) NOT NULL');
    expect(schema).toContain('"plan" jsonb NOT NULL');
    expect(schema).toContain('"score" double precision NOT NULL');
    expect(schema).toContain('"rank" integer NOT NULL');
    expect(schema).toContain(
      '"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
    );
    expect(schema).toContain('PRIMARY KEY ("id")');
    expect(query.mock.calls[1][0]).toContain(
      'CREATE INDEX "IDX_submissions_score" ON "submissions" ("score")',
    );
  });

  it('rolls back its index before dropping its table', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new CreateSubmissions1790159845335().down({
      query,
    } as unknown as QueryRunner);
    expect(query.mock.calls).toEqual([
      ['DROP INDEX "public"."IDX_submissions_score"'],
      ['DROP TABLE "submissions"'],
    ]);
  });
});
