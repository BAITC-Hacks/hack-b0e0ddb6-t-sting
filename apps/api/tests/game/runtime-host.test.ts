import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountGameRuntime } from '../../src/game/runtime-host';

const { requireModule } = vi.hoisted(() => ({ requireModule: vi.fn() }));
vi.mock('node:module', () => ({ createRequire: () => requireModule }));

describe('optional game runtime embedding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not load or mount anything when integration is not configured', async () => {
    const host = { use: vi.fn() };
    const load = vi.fn();
    await expect(mountGameRuntime(host, {}, load)).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(host.use).not.toHaveBeenCalled();
  });

  it('mounts the configured middleware and passes the explicit dependency paths', async () => {
    const host = { use: vi.fn() };
    const handler = vi.fn();
    const createGameMiddleware = vi.fn().mockResolvedValue(handler);
    requireModule.mockReturnValue({ createGameMiddleware });
    const env = {
      GAME_RUNTIME_MODULE: '/runtime/src/server/host.js',
      DOMAIN_MODULE: '/domain/index.js',
      REFERENCE_WRAPPER_ADAPTER: '/wrapper/adapter.js',
    };
    await expect(mountGameRuntime(host, env)).resolves.toBe(true);
    expect(requireModule).toHaveBeenCalledWith(env.GAME_RUNTIME_MODULE);
    expect(createGameMiddleware).toHaveBeenCalledWith({
      domainPath: env.DOMAIN_MODULE,
      wrapperPath: env.REFERENCE_WRAPPER_ADAPTER,
    });
    expect(host.use).toHaveBeenCalledExactlyOnceWith(handler);
  });

  it('passes missing dependencies through so the runtime reports unavailability', async () => {
    const handler = (
      _req: IncomingMessage,
      _res: ServerResponse,
      next: () => void,
    ) => next();
    const createGameMiddleware = vi.fn().mockResolvedValue(handler);
    const host = { use: vi.fn() };
    await mountGameRuntime(
      host,
      { GAME_RUNTIME_MODULE: '/runtime.js' },
      () => ({ createGameMiddleware }),
    );
    expect(createGameMiddleware).toHaveBeenCalledWith({
      domainPath: undefined,
      wrapperPath: undefined,
    });
    // The host receives the same callable rather than a competing HTTP server.
    const next = vi.fn();
    host.use.mock.calls[0][0](
      {} as IncomingMessage,
      {} as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('fails startup safely for an unreadable configured runtime', async () => {
    const host = { use: vi.fn() };
    await expect(
      mountGameRuntime(host, { GAME_RUNTIME_MODULE: '/missing.js' }, () => {
        throw new Error('secret filesystem detail');
      }),
    ).rejects.toThrow('GAME_RUNTIME_UNAVAILABLE');
    expect(host.use).not.toHaveBeenCalled();
  });

  it('rejects an incompatible runtime before mounting routes', async () => {
    const host = { use: vi.fn() };
    const createGameMiddleware = vi.fn().mockResolvedValue(null);
    await expect(
      mountGameRuntime(host, { GAME_RUNTIME_MODULE: '/bad.js' }, () => ({
        createGameMiddleware,
      })),
    ).rejects.toThrow('GAME_RUNTIME_UNAVAILABLE');
    expect(host.use).not.toHaveBeenCalled();
  });
});
