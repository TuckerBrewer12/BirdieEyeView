import type { ExtractRequest, ScanRepository } from "../../data/scanRepository";
import type { SaveScanRequestDto, ScanDto } from "../../types/api";
import { InMemoryRounds } from "./InMemoryRounds";
import { ScanFailedError } from "@/lib/scanReports";

export interface FakeScanRepositorySeed {
  /** What extract reads off any card. Unset, extract fails. */
  result?: ScanDto;
  /** What reading the card ahead of time returns. */
  text?: string | null;
  /** Extract fails with this, as the server's user-facing message. */
  extractError?: string;
  /** Extract waits for `finishExtract()`, so a test can see the scan in progress. */
  holdExtract?: boolean;
  /**
   * Where saved scans go. Share a FakeRoundsRepository's store and the saved round can be
   * read back; set its `saveError` to make saving fail.
   */
  store?: InMemoryRounds;
}

/** Stands in for the scan endpoints and records what the page sent. */
export class FakeScanRepository implements ScanRepository {
  readonly readPhotos: File[] = [];
  readonly extractRequests: ExtractRequest[] = [];
  readonly store: InMemoryRounds;
  private readonly seed: FakeScanRepositorySeed;
  private release: (() => void) | null = null;

  constructor(seed: FakeScanRepositorySeed = {}) {
    this.seed = seed;
    this.store = seed.store ?? new InMemoryRounds();
  }

  /** Every scan saved, as sent. */
  get saveRequests(): SaveScanRequestDto[] {
    return this.store.savedScans;
  }

  async readText(photo: File): Promise<string | null> {
    this.readPhotos.push(photo);
    return this.seed.text ?? null;
  }

  async extract(request: ExtractRequest): Promise<ScanDto> {
    this.extractRequests.push(request);
    if (this.seed.holdExtract) {
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    }
    // As the API client does: a failed read carries why, for a report.
    const failure = { category: "extraction_failed", stage: "parse", http_status: 500 } as const;
    if (this.seed.extractError) throw new ScanFailedError(this.seed.extractError, failure);
    if (!this.seed.result) throw new ScanFailedError("Could not read this scorecard.", failure);
    return this.seed.result;
  }

  async save(request: SaveScanRequestDto): Promise<string> {
    return this.store.saveScan(request);
  }

  /** Lets a held extract answer. */
  finishExtract(): void {
    this.release?.();
    this.release = null;
  }
}
