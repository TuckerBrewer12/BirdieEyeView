import { api } from "@/lib/api";
import type { SaveScanRequestDto, ScanDto } from "@/types/api";

export interface ExtractRequest {
  photo: File;
  userContext: string;
  ocrText: string | null;
  courseId?: string | null;
}

export interface ScanRepository {
  readText(photo: File): Promise<string | null>;
  extract(request: ExtractRequest): Promise<ScanDto>;
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
