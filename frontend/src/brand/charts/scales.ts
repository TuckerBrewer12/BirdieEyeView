import { scaleLinear } from "d3-scale";

type Maybe = number | null | undefined;

/** The values that are there, in order. */
export function knownValues(values: readonly Maybe[]): number[] {
  return values.filter((v): v is number => v != null);
}

/** Where the last value that is there sits, or -1 when none is. */
export function lastKnownIndex(values: readonly Maybe[]): number {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] != null) return i;
  return -1;
}

/**
 * The span the values cover, widened so a line never touches the plot's edge.
 * `pad` is a fixed amount in the values' own unit (5 strokes, half a handicap point)
 * or a share of the span (`{ ratio: 0.15 }`). A flat run still gets headroom.
 * Null when there is nothing to measure.
 */
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

/** One point per index: the first sits at `left`, the last at `right`. */
export function indexScale(count: number, left: number, right: number) {
  return scaleLinear().domain([0, Math.max(count - 1, 1)]).range([left, right]);
}
