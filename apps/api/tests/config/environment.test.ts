import { describe, expect, it } from 'vitest';
import { getPort, requiredValue } from '../../src/config/environment';

describe('requiredValue', () => {
  it('preserves nonempty values, including spaces in passwords', () => {
    expect(requiredValue({ PASSWORD: ' my password ' }, 'PASSWORD')).toBe(
      ' my password ',
    );
  });

  it.each([undefined, '', '   '])(
    'rejects missing or blank configuration: %s',
    (value) => {
      expect(() =>
        requiredValue({ POSTGRES_PASSWORD: value }, 'POSTGRES_PASSWORD'),
      ).toThrow('POSTGRES_PASSWORD is required');
    },
  );
});

describe('getPort', () => {
  it('uses the default when the variable is absent', () => {
    expect(getPort({}, 'API_PORT', 3000)).toBe(3000);
  });

  it.each([
    ['1', 1],
    ['65535', 65535],
    ['5433', 5433],
  ] as const)('accepts valid port %s', (value, expected) => {
    expect(getPort({ API_PORT: value }, 'API_PORT', 3000)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    'abc',
    '0',
    '-1',
    '1.5',
    '65536',
    'Infinity',
    '0x123',
    '1e3',
  ])('rejects invalid port %s', (value) => {
    expect(() => getPort({ API_PORT: value }, 'API_PORT', 3000)).toThrow(
      'API_PORT must be an integer between 1 and 65535',
    );
  });
});
