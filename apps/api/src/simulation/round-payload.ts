/** JSON response formatting is separate from the full-precision domain math. */
export function roundPayload<T>(value: T): T {
  if (typeof value === 'number') return Number(value.toFixed(2)) as T;
  if (Array.isArray(value))
    return value.map((item: unknown) => roundPayload(item)) as T;
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, roundPayload(item)]),
    ) as T;
  return value;
}
