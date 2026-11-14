export class FakeHandler<Args extends unknown[] = unknown[]> {
  readonly calls: Args[] = [];

  readonly handle = (...args: Args): void => {
    this.calls.push(args);
  };
}
