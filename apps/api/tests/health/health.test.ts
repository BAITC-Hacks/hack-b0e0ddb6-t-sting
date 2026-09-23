import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../../src/health/health.controller';
import { HealthService } from '../../src/health/health.service';

function createController(query: ReturnType<typeof vi.fn>) {
  const database = { query } as unknown as DataSource;
  return new HealthController(new HealthService(database));
}

describe('health endpoint', () => {
  it('reports success after checking the database connection', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = createController(query);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns HTTP 503 without exposing database error details', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('secret connection details'));
    const controller = createController(query);

    const error = await controller.check().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
