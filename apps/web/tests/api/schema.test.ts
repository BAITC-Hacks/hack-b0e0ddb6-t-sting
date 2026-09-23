import { describe, expect, it } from 'vitest';
import { matches } from '../../src/api/schema';
import type { Schema } from '../../src/api/schema';
describe('response schema', () => {
  it.each<[unknown, Schema, boolean]>([
    [undefined, 'unknown', true],
    ['abc', 'string', true],
    [null, 'string', false],
    [2.4, 'number', true],
    [Infinity, 'number', false],
    ['2', 'number', false],
    [true, 'boolean', true],
    [false, 'boolean', true],
    [0, 'boolean', false],
    ['x', { values: ['x', 'y'] }, true],
    ['z', { values: ['x'] }, false],
    [undefined, { optional: 'number' }, true],
    [1, { optional: 'number' }, true],
    [null, { optional: 'number' }, false],
    [[], { array: 'number' }, true],
    [[1, 2], { array: 'number', min: 2 }, true],
    [[1], { array: 'number', min: 2 }, false],
    [[1, 'x'], { array: 'number' }, false],
    [{}, { array: 'number' }, false],
    [null, { fields: {} }, false],
    [1, { fields: {} }, false],
    [[], { fields: {} }, false],
    [{ id: 1 }, { fields: { id: 'number' } }, true],
    [{}, { fields: { id: 'number' } }, false],
  ])('validates value %j against %j', (value, schema, expected) => {
    expect(matches(value, schema)).toBe(expected);
  });
});
