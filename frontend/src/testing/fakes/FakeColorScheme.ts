export class FakeColorScheme {
  private dark: boolean;
  private readonly listeners = new Set<(event: MediaQueryListEvent) => void>();
  private readonly original = window.matchMedia;

  constructor({ dark }: { dark: boolean }) {
    this.dark = dark;
  }

  install(): this {
    window.matchMedia = ((media: string) => ({
      media,
      matches: media === "(prefers-color-scheme: dark)" && this.dark,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => this.listeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        this.listeners.delete(listener),
    })) as unknown as typeof window.matchMedia;
    return this;
  }

  setDark(dark: boolean): void {
    this.dark = dark;
    this.listeners.forEach((listener) => listener({ matches: dark } as MediaQueryListEvent));
  }

  restore(): void {
    window.matchMedia = this.original;
  }
}
