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

/**
 * The span the values cover, widened out to round steps so the grid lands on
 * round numbers. `count` is the number of steps wanted, roughly. A flat run
 * gets `flat` either side. Null when there is nothing to measure.
 */
export function niceExtent(values: readonly Maybe[], count: number, flat: number): [number, number] | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const [lo, hi] = min === max ? [min - flat, max + flat] : [min, max];
  const [niceLo, niceHi] = scaleLinear().domain([lo, hi]).nice(count).domain();
  return [niceLo, niceHi];
}

/**
 * The span the values cover, out to the step below the lowest (`floor`) and the step above the
 * highest (`ceiling`), so a value never sits on the edge: scores 69 to 85 in fives and tens run
 * 65 to 90. Null when there is nothing to measure.
 */
export function steppedExtent(values: readonly Maybe[], floor: number, ceiling: number): [number, number] | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  const lo = Math.floor(Math.min(...known) / floor) * floor;
  const hi = Math.ceil(Math.max(...known) / ceiling) * ceiling;
  return [lo, hi === lo ? hi + ceiling : hi];
}

/** Every multiple of `step` inside the domain, past its bottom edge: the grid lines a plot draws. */
export function stepsWithin([lo, hi]: number[], step: number): number[] {
  const steps: number[] = [];
  for (let v = Math.floor(lo / step) * step + step; v <= hi; v += step) steps.push(v);
  return steps;
}
