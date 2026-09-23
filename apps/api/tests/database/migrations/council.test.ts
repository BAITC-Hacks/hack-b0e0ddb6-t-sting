import type { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { CreateCouncilSessions1790163000000 } from '../../../src/database/migrations/1790163000000-CreateCouncilSessions';

describe('council migration', () => {
  it('stores event history, protocol and original plan independently', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new CreateCouncilSessions1790163000000().up({
      query,
    } as unknown as QueryRunner);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('"plan" jsonb NOT NULL');
    expect(sql).toContain('"events" jsonb NOT NULL');
    expect(sql).toContain('"protocol" jsonb');
    expect(sql).toContain('"status" character varying(10) NOT NULL');
    expect(sql).toContain('PRIMARY KEY ("id")');
    expect(sql).toContain("'running', 'closed', 'failed'");
  });
  it('drops only its own session table on rollback', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new CreateCouncilSessions1790163000000().down({
      query,
    } as unknown as QueryRunner);
    expect(query.mock.calls).toEqual([['DROP TABLE "council_sessions"']]);
  });
});
