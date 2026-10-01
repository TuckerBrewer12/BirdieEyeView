/**
 * Stands in for a callback prop (onClick, onSelect, …) and records every call, so a test can
 * check what a component handed back without a Vitest mock.
 */
export class FakeHandler<Args extends unknown[] = unknown[]> {
  readonly calls: Args[] = [];

  /** Pass this as the prop. Bound, so it can be handed over directly. */
  readonly handle = (...args: Args): void => {
    this.calls.push(args);
  };
}
