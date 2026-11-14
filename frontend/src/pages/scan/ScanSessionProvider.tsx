import { useMemo, useState, type ReactNode } from "react";
import { newScanSession, ScanSessionContext, type ScanSession } from "./scanSession";

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ScanSession>(() => newScanSession());
  const store = useMemo(() => ({ session, setSession }), [session]);
  return <ScanSessionContext.Provider value={store}>{children}</ScanSessionContext.Provider>;
}
