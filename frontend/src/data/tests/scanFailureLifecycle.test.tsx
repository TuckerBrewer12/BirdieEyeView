import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useScan } from "../useScan";
import { usePublicScan } from "../usePublicScan";
import { initialScanState } from "@/types/scan";
import type { ScanState } from "@/types/scan";
import { FakeScanTransport } from "@/testing/fakes/FakeScanTransport";
import { FakeStorage } from "@/testing/fakes/FakeStorage";

const originalFetch = globalThis.fetch;
const originalCreateUrl = URL.createObjectURL;
const originalRevokeUrl = URL.revokeObjectURL;
const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
let backend: FakeScanTransport;

beforeEach(() => {
  backend = new FakeScanTransport();
  globalThis.fetch = backend.send;
  Object.defineProperty(window, "localStorage", { configurable: true, value: new FakeStorage() });
  URL.createObjectURL = () => "blob:test-preview";
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreateUrl;
  URL.revokeObjectURL = originalRevokeUrl;
  if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
});

function file(name: string) {
  // PDFs bypass browser image compression; these tests concern request state.
  return new File([`%PDF-${name}`], `${name}.pdf`, { type: "application/pdf" });
}

describe("failed-attempt lifetime", () => {
  it("signed-in scan ignores an old failure after the file is cleared", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => {
      const [state, setState] = useState<ScanState>({ ...initialScanState, file: file("first"), prefetchedOcrText: "scorecard" });
      return useScan("user", state, setState);
    }, { wrapper });
    let pending: Promise<void>;
    act(() => { pending = result.current.handleExtract(); });
    act(() => result.current.update({ file: null, step: "upload" }));
    await act(async () => { backend.failNext(); await pending; });
    expect(result.current.error).toBeNull();
    expect(result.current.report.available).toBe(false);
    expect(result.current.file).toBeNull();
  });

  it("public scan ignores an old failure after reset", async () => {
    const { result } = renderHook(() => usePublicScan());
    await act(async () => result.current.handleFile(file("first")));
    let pending: Promise<void>;
    act(() => { pending = result.current.handleExtract(); });
    act(() => result.current.reset());
    await act(async () => { backend.failNext(); await pending; });
    expect(result.current.step).toBe("upload");
    expect(result.current.error).toBeNull();
    expect(result.current.report.available).toBe(false);
    expect(result.current.file).toBeNull();
  });

  it("public scan reports the new file's failure and drops the previous one", async () => {
    const { result } = renderHook(() => usePublicScan());
    await act(async () => result.current.handleFile(file("first")));
    let first: Promise<void>;
    act(() => { first = result.current.handleExtract(); });
    await act(async () => result.current.handleFile(file("second-longer")));
    let second: Promise<void>;
    act(() => { second = result.current.handleExtract(); });
    await act(async () => { backend.failNext(); await first; });
    expect(result.current.step).toBe("processing");
    expect(result.current.report.available).toBe(false);
    await act(async () => { backend.failNext(); await second; });
    act(() => result.current.report.submit());
    await waitFor(() => expect(result.current.report.status).toBe("sent"));
    const image = backend.reports[0].get("file") as File;
    expect(image.name).toBe("scorecard.pdf");
    expect(image.size).toBe(file("second-longer").size);
  });
});
