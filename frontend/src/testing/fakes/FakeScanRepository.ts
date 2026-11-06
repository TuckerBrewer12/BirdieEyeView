import type { ExtractRequest, ScanRepository } from "../../data/scanRepository";
import type { SaveScanRequestDto, ScanDto } from "../../types/api";
import { InMemoryRounds } from "./InMemoryRounds";

export interface FakeScanRepositorySeed {
  result?: ScanDto;
  text?: string | null;
  extractError?: string;
  holdExtract?: boolean;
  store?: InMemoryRounds;
}

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
    if (this.seed.extractError) throw new Error(this.seed.extractError);
    if (!this.seed.result) throw new Error("Could not read this scorecard.");
    return this.seed.result;
  }

  async save(request: SaveScanRequestDto): Promise<string> {
    return this.store.saveScan(request);
  }

  finishExtract(): void {
    this.release?.();
    this.release = null;
  }
}
