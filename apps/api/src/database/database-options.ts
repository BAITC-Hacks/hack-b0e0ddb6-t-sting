import type { DataSourceOptions } from 'typeorm';
import { getPort, requiredValue } from '../config/environment';

/** Share safe connection and migration settings between Nest and the CLI. */
export function createDatabaseOptions(
  env: Record<string, string | undefined>,
): Extract<DataSourceOptions, { type: 'postgres' }> {
  return {
    type: 'postgres',
    host: requiredValue(env, 'POSTGRES_HOST'),
    port: getPort(env, 'POSTGRES_PORT', 5432),
    username: requiredValue(env, 'POSTGRES_USER'),
    password: requiredValue(env, 'POSTGRES_PASSWORD'),
    database: requiredValue(env, 'POSTGRES_DB'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
    connectTimeoutMS: 5000,
    extra: { statement_timeout: 3000 },
  };
}
