/** Checks only explicit numeric literals; IDs are validated separately. */
export function unsupportedNumbers(
  text: string,
  allowed: readonly number[],
): number[] {
  const permitted = new Set(
    allowed.flatMap((value) => [
      value,
      Number(value.toFixed(2)),
      Number(value.toFixed(3)),
    ]),
  );
  return Array.from(
    text.matchAll(/[−+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/g),
    (match) => Number(match[0].replace('−', '-').replace(',', '.')),
  ).filter((value) => !permitted.has(value));
}
