import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://localhost:3000',
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    envDir: root,
    server: {
      port: Number(env.WEB_PORT || 5173),
      strictPort: true,
      proxy,
      watch: { usePolling: true },
    },
    preview: { proxy },
  };
});
