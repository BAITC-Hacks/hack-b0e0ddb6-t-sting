import { describe, expect, it } from 'vitest';
import { createDatabaseOptions } from '../../src/database/database-options';

const environment = {
  POSTGRES_HOST: 'database.internal',
  POSTGRES_USER: 'test-user',
  POSTGRES_PASSWORD: 'test-password',
  POSTGRES_DB: 'test-db',
};

describe('createDatabaseOptions', () => {
  it('configures PostgreSQL without automatically changing the schema', () => {
    const options = createDatabaseOptions(environment);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'database.internal',
      port: 5432,
      username: 'test-user',
      password: 'test-password',
      database: 'test-db',
      synchronize: false,
      migrationsRun: false,
      connectTimeoutMS: 5000,
      extra: { statement_timeout: 3000 },
    });
    expect(options.entities).toEqual([
      expect.stringMatching(/\/\.\.\/\*\*\/\*\.entity\{\.ts,\.js\}$/),
    ]);
    expect(options.migrations).toEqual([
      expect.stringMatching(/\/migrations\/\*\{\.ts,\.js\}$/),
    ]);
  });

  it('enables verified TLS with the configured database CA certificate', () => {
    const options = createDatabaseOptions({
      ...environment,
      POSTGRES_CA_CERT:
        '  -----BEGIN CERTIFICATE-----\nCA contents\n-----END CERTIFICATE-----\n',
    });

    expect(options.ssl).toEqual({
      ca: '-----BEGIN CERTIFICATE-----\nCA contents\n-----END CERTIFICATE-----',
      rejectUnauthorized: true,
    });
  });

  it('accepts escaped newlines in a database CA certificate', () => {
    const options = createDatabaseOptions({
      ...environment,
      POSTGRES_CA_CERT:
        '-----BEGIN CERTIFICATE-----\\nCA contents\\n-----END CERTIFICATE-----',
    });

    expect(options.ssl).toEqual({
      ca: '-----BEGIN CERTIFICATE-----\nCA contents\n-----END CERTIFICATE-----',
      rejectUnauthorized: true,
    });
  });

  it.each([undefined, '', ' \n '])(
    'preserves driver TLS defaults when the CA certificate is %j',
    (certificate) => {
      expect(
        createDatabaseOptions({ ...environment, POSTGRES_CA_CERT: certificate })
          .ssl,
      ).toBeUndefined();
    },
  );

  it('uses a configured database port', () => {
    expect(
      createDatabaseOptions({ ...environment, POSTGRES_PORT: '5434' }).port,
    ).toBe(5434);
  });

  it.each([
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ])('refuses to start without %s', (key) => {
    expect(() =>
      createDatabaseOptions({ ...environment, [key]: undefined }),
    ).toThrow(`${key} is required`);
  });
});
