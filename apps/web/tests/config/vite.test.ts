// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from 'vite';
import configureVite from '../../vite.config';

// Isolate the configuration from the developer's real .env file.
vi.mock('vite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vite')>()),
  loadEnv: vi.fn(),
}));

function configure(environment: Record<string, string>) {
  vi.mocked(loadEnv).mockReturnValue(environment);
  return configureVite({ command: 'serve', mode: 'test' });
}

describe('Vite server configuration', () => {
  it('uses stable default ports and a same-origin API proxy', () => {
    const options = configure({});

    expect(options.server).toMatchObject({
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
      },
    });
    expect(options.preview?.proxy).toEqual(options.server?.proxy);
  });

  it('uses configured web and API addresses', () => {
    const options = configure({
      WEB_PORT: '5174',
      API_PROXY_TARGET: 'http://localhost:3001',
    });

    expect(options.server).toMatchObject({
      port: 5174,
      proxy: { '/api': { target: 'http://localhost:3001' } },
    });
  });

  it.each(['0', '1e3', 'abc', '', '-1', '65536', '1.5'])(
    'rejects an invalid explicit web port: %s',
    (port) => {
      expect(() => configure({ WEB_PORT: port })).toThrow(
        'WEB_PORT must be an integer between 1 and 65535',
      );
    },
  );
});
