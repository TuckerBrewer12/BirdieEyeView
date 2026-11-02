/** Appends a rolling average field to each row. Null values in the window are skipped. */
export function withRollingAverage<T>(
  data: T[],
  getValue: (row: T) => number | null,
  w = 5,
): (T & { rolling_avg: number | null })[] {
  return data.map((row, i) => {
    const slice = data.slice(Math.max(0, i - w + 1), i + 1);
    const valid = slice.map(getValue).filter((v): v is number => v != null);
    return {
      ...row,
      rolling_avg: valid.length
        ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
        : null,
    };
  });
}

/** Simple array average. Returns null for empty arrays. */
export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

