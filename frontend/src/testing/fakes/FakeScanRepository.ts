import type { ExtractRequest, ScanRepository } from "../../data/scanRepository";
import type { ScanResult } from "../../types/scan";

export interface FakeScanRepositorySeed {
  /** What extract reads off any card. Unset, extract fails. */
  result?: ScanResult;
  /** What reading the card ahead of time returns. */
  text?: string | null;
  /** Extract fails with this, as the server's user-facing message. */
  extractError?: string;
  /** Extract waits for `finishExtract()`, so a test can see the scan in progress. */
  holdExtract?: boolean;
}

/** Stands in for the scan endpoints and records what the page sent. */
export class FakeScanRepository implements ScanRepository {
  readonly readPhotos: File[] = [];
  readonly extractRequests: ExtractRequest[] = [];
  private readonly seed: FakeScanRepositorySeed;
  private release: (() => void) | null = null;

  constructor(seed: FakeScanRepositorySeed = {}) {
    this.seed = seed;
  }

  async readText(photo: File): Promise<string | null> {
    this.readPhotos.push(photo);
    return this.seed.text ?? null;
  }

  async extract(request: ExtractRequest): Promise<ScanResult> {
    this.extractRequests.push(request);
    if (this.seed.holdExtract) {
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    }
    if (this.seed.extractError) throw new Error(this.seed.extractError);
    if (!this.seed.result) throw new Error("Could not read this scorecard.");
    return this.seed.result;
  }

  /** Lets a held extract answer. */
  finishExtract(): void {
    this.release?.();
    this.release = null;
  }
}
