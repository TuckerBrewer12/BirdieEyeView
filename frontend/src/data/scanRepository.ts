import { api } from "@/lib/api";
import type { SaveScanRequestDto, ScanDto } from "@/types/api";

export interface ExtractRequest {
  photo: File;
  /** What the golfer said is on the card: their name, scoring format, extra rows. */
  userContext: string;
  /** The card's text, when it was read ahead of time; extract reads it itself otherwise. */
  ocrText: string | null;
  /** A course the golfer picked before scanning, so extract can read the card against it. */
  courseId?: string | null;
}

export interface ScanRepository {
  /** Reads the card's text, so extract can skip that step. Null when nothing came back. */
  readText(photo: File): Promise<string | null>;
  extract(request: ExtractRequest): Promise<ScanDto>;
  /** Saves a reviewed scan as a round, and returns the new round's id. */
  save(request: SaveScanRequestDto): Promise<string>;
}

export const scanRepository: ScanRepository = {
  readText(photo) {
    return api.readScanText(photo);
  },

  extract({ photo, userContext, ocrText, courseId }) {
    const fields: Record<string, string | File> = { file: photo };
    if (courseId) fields.course_id = courseId;
    if (userContext.trim()) fields.user_context = userContext.trim();
    if (ocrText) fields.ocr_text = ocrText;
    return api.extractScan(fields);
  },

  async save(request) {
    const saved = await api.saveScan(request);
    return saved.id;
  },
};
