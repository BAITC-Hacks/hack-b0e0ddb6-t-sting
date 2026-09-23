import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['apps/api/tests/**/*.test.ts'],
          setupFiles: ['reflect-metadata'],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/tests/**/*.test.{ts,tsx}'],
          setupFiles: ['apps/web/tests/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**/*.{ts,tsx}'],
      exclude: [
        // Entry points and Nest's declarative wiring are exercised by the live smoke test.
        'apps/api/src/main.ts',
        'apps/api/src/app.module.ts',
        // CLI initialization and loading .env are process-level bootstrap operations.
        'apps/api/src/database/data-source.ts',
        'apps/api/src/config/load-env.ts',
        // Mounting React into the document is browser bootstrap.
        'apps/web/src/main.tsx',
        'apps/web/src/vite-env.d.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        perFile: true,
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
