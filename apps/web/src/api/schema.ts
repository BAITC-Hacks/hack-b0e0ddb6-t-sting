/** Small declarative response validator: unknown network data never reaches the UI unchecked. */
export type Schema =
  | 'string'
  | 'number'
  | 'boolean'
  | 'unknown'
  | { values: readonly unknown[] }
  | { array: Schema; min?: number }
  | { fields: Record<string, Schema> }
  | { optional: Schema };

export function matches(value: unknown, schema: Schema): boolean {
  if (schema === 'unknown') return true;
  if (schema === 'number')
    return typeof value === 'number' && Number.isFinite(value);
  if (typeof schema === 'string') return typeof value === schema;
  if ('values' in schema) return schema.values.includes(value);
  if ('optional' in schema)
    return value === undefined || matches(value, schema.optional);
  if ('array' in schema)
    return (
      Array.isArray(value) &&
      value.length >= (schema.min ?? 0) &&
      value.every((item) => matches(item, schema.array))
    );
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return Object.entries(schema.fields).every(([key, child]) =>
    matches(record[key], child),
  );
}
