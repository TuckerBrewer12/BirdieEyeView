import { useMemo, useRef, useState, type ReactNode } from "react";
import { newScanSession, ScanSessionContext, type ScanSession } from "./scanSession";

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ScanSession>(() => newScanSession());
  const readingRef = useRef<AbortController | null>(null);
  const store = useMemo(() => ({ session, setSession, readingRef }), [session]);
  return <ScanSessionContext.Provider value={store}>{children}</ScanSessionContext.Provider>;
}
