import { apiUrl } from "@/lib/apiBase";
import { withAuthHeaders } from "@/lib/sessionToken";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";
import type { ScanResult } from "@/types/scan";

export interface ExtractRequest {
  photo: File;
  /** What the golfer said is on the card: their name, scoring format, extra rows. */
  userContext: string;
  /** The card's text, when it was read ahead of time; extract reads it itself otherwise. */
  ocrText: string | null;
}

export interface ScanRepository {
  /** Reads the card's text, so extract can skip that step. Null when nothing came back. */
  readText(photo: File): Promise<string | null>;
  extract(request: ExtractRequest): Promise<ScanResult>;
}

function upload(fields: Record<string, string | File>): RequestInit {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return { method: "POST", credentials: "include", headers: withAuthHeaders(), body: form };
}

export const scanRepository: ScanRepository = {
  async readText(photo) {
    const res = await fetch(apiUrl("/api/scan/ocr"), upload({ file: photo }));
    if (!res.ok) return null;
    const body = (await res.json()) as { ocr_text?: string | null };
    return body.ocr_text ?? null;
  },

  async extract({ photo, userContext, ocrText }) {
    const fields: Record<string, string | File> = { file: photo };
    if (userContext.trim()) fields.user_context = userContext.trim();
    if (ocrText) fields.ocr_text = ocrText;
    const res = await fetchWithUserFacingError(
      apiUrl("/api/scan/extract"),
      upload(fields),
      USER_FACING_ERRORS.scan,
    );
    if (!res.ok) throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.scan));
    return parseJsonResponse<ScanResult>(res, USER_FACING_ERRORS.scan);
  },
};
