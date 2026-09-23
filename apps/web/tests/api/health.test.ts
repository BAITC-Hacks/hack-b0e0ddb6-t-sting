import { describe, expect, it, vi } from 'vitest';
import { checkHealth } from '../../src/api/health';

describe('checkHealth', () => {
  it('checks the API through the same-origin proxy with a timeout', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok', database: 'up' })),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(checkHealth()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('/api/health', {
      signal: expect.any(AbortSignal),
    });
  });

  it('rejects an unavailable API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    await expect(checkHealth()).rejects.toThrow('API is unavailable');
  });

  it.each([
    null,
    {},
    [],
    'ok',
    { database: 'up' },
    { status: 'error' },
    { status: 'ok' },
    { status: 'ok', database: 'down' },
  ])('rejects an unexpected response: %j', async (payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))),
    );
    await expect(checkHealth()).rejects.toThrow('Unexpected health response');
  });

  it.each(['', 'not json'])('rejects invalid JSON: %s', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    await expect(checkHealth()).rejects.toThrow();
  });

  it('propagates network failures for the page to handle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Network unavailable')),
    );
    await expect(checkHealth()).rejects.toThrow('Network unavailable');
  });

  it('propagates request timeouts for the page to handle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')),
    );
    await expect(checkHealth()).rejects.toThrow('Timed out');
  });
});
