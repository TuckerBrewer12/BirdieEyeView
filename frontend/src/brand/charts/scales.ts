import { scaleLinear } from "d3-scale";

type Maybe = number | null | undefined;

export function knownValues(values: readonly Maybe[]): number[] {
  return values.filter((v): v is number => v != null);
}

export function lastKnownIndex(values: readonly Maybe[]): number {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] != null) return i;
  return -1;
}

export function paddedExtent(
  values: readonly Maybe[],
  pad: number | { ratio: number },
): [number, number] | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const by = typeof pad === "number" ? pad : (max - min || 1) * pad.ratio;
  return [min - by, max + by];
}

export function indexScale(count: number, left: number, right: number) {
  return scaleLinear().domain([0, Math.max(count - 1, 1)]).range([left, right]);
}
