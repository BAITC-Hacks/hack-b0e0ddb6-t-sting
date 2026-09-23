import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Middleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => unknown;
interface RuntimeModule {
  createGameMiddleware(options: {
    domainPath?: string;
    wrapperPath?: string;
  }): Promise<Middleware>;
}
const loadModule = (path: string): RuntimeModule =>
  createRequire(__filename)(resolve(path)) as RuntimeModule;

/** Opt-in embedding: the existing application remains the only HTTP server. */
export async function mountGameRuntime(
  host: { use(handler: Middleware): void },
  env: NodeJS.ProcessEnv,
  load: (path: string) => RuntimeModule = loadModule,
): Promise<boolean> {
  if (!env.GAME_RUNTIME_MODULE) return false;
  try {
    const runtime = load(env.GAME_RUNTIME_MODULE);
    const handler = await runtime.createGameMiddleware({
      domainPath: env.DOMAIN_MODULE,
      wrapperPath: env.REFERENCE_WRAPPER_ADAPTER,
    });
    if (typeof handler !== 'function') throw new Error('Invalid middleware');
    host.use(handler);
    return true;
  } catch {
    // A configured but broken integration must not look like a healthy startup.
    throw new Error('GAME_RUNTIME_UNAVAILABLE');
  }
}
