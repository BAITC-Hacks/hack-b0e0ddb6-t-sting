import type { DataSourceOptions } from 'typeorm';
import { getPort, requiredValue } from '../config/environment';

/** Share safe connection and migration settings between Nest and the CLI. */
export function createDatabaseOptions(
  env: Record<string, string | undefined>,
): Extract<DataSourceOptions, { type: 'postgres' }> {
  // App Platform injects PEM certificates; also accept escaped newlines from .env.
  const ca = env.POSTGRES_CA_CERT?.replace(/\\n/g, '\n').trim();

  return {
    type: 'postgres',
    host: requiredValue(env, 'POSTGRES_HOST'),
    port: getPort(env, 'POSTGRES_PORT', 5432),
    username: requiredValue(env, 'POSTGRES_USER'),
    password: requiredValue(env, 'POSTGRES_PASSWORD'),
    database: requiredValue(env, 'POSTGRES_DB'),
    ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
    connectTimeoutMS: 5000,
    extra: { statement_timeout: 3000 },
  };
}
