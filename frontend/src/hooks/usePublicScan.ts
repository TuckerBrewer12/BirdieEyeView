import { useState, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/apiBase";
import { withAuthHeaders } from "@/lib/sessionToken";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";
import type { ScanResult } from "@/types/scan";
import { compressImageForUpload } from "@/platform/compressImage";

type PublicScanStep = "upload" | "processing" | "review";

export function usePublicScan() {
  const [step, setStep] = useState<PublicScanStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userContext, setUserContext] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefetchedOcrText = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const activePrefetch = useRef<string | null>(null);

  // Synchronous — fires OCR in a nested fire-and-forget IIFE, matching useScan pattern
  const handleFile = useCallback((f: File) => {
    const fileId = `${f.name}-${f.size}-${Date.now()}`;
    activePrefetch.current = fileId;
    prefetchedOcrText.current = null;
    setError(null);

    void (async () => {
      const processed = await compressImageForUpload(f);
      if (activePrefetch.current !== fileId) return;

      // Revoke previous preview
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(processed);
      previewUrlRef.current = url;
      setFile(processed);
      setPreview(url);

      // Kick off OCR immediately in the background
      void (async () => {
        try {
          const form = new FormData();
          form.append("file", processed);
          const res = await fetch(apiUrl("/api/scan/ocr"), {
            method: "POST",
            credentials: "include",
            headers: withAuthHeaders(),
            body: form,
          });
          if (res.ok) {
            const { ocr_text } = await res.json() as { ocr_text: string };
            if (activePrefetch.current === fileId) {
              prefetchedOcrText.current = ocr_text;
            }
          }
        } catch {
          // Prefetch failed silently — extract will run OCR itself
        }
      })();
    })();
  }, []);

  const handleExtract = useCallback(async () => {
    if (!file) return;
    setError(null);
    setStep("processing");
    setExtracting(true);

    try {
      const form = new FormData();
      form.append("file", file);
      if (userContext.trim()) form.append("user_context", userContext.trim());
      if (prefetchedOcrText.current) form.append("ocr_text", prefetchedOcrText.current);

      const res = await fetchWithUserFacingError(apiUrl("/api/scan/extract"), {
        method: "POST",
        credentials: "include",
        headers: withAuthHeaders(),
        body: form,
      }, USER_FACING_ERRORS.scan);
      if (!res.ok) {
        throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.scan));
      }
      const data = await parseJsonResponse<ScanResult>(res, USER_FACING_ERRORS.scan);
      setResult(data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed. Please try again.");
      setStep("upload");
    } finally {
      setExtracting(false);
    }
  }, [file, userContext]);

  const reset = useCallback(() => {
    activePrefetch.current = null;
    prefetchedOcrText.current = null;
    if (previewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    setStep("upload");
    setFile(null);
    setPreview(null);
    setUserContext("");
    setResult(null);
    setError(null);
    setExtracting(false);
  }, []);

  return {
    step,
    file,
    preview,
    userContext,
    setUserContext,
    extracting,
    result,
    error,
    handleFile,
    handleExtract,
    reset,
  };
}
