import { describe, expect, it } from "vitest";
import { createScanReportRepository, REPORT_NOT_SAVED, REPORT_UNAVAILABLE } from "./scanReportRepository";
import { failedScanAttempt, readScanFailure } from "@/lib/scanReports";

class FakeReportTransport {
  readonly requests: RequestInit[] = [];
  status = 200;
  payload: unknown = { status: "saved" };
  offline = false;

  send: typeof fetch = async (_url, options) => {
    this.requests.push(options ?? {});
    if (this.offline) throw new Error("private-host.internal");
    return Response.json(this.payload, { status: this.status });
  };
}

function attempt() {
  return failedScanAttempt(new File(["failed image"], "alice-private.png", { type: "image/png" }), {
    category: "unreadable_scores", stage: "parse", http_status: 422,
  });
}

describe("anonymous report transport", () => {
  it("sends only allowlisted metadata and a generically named image without credentials or referrer", async () => {
    const transport = new FakeReportTransport();
    const failed = attempt();
    await createScanReportRepository(transport.send).submit(failed);
    const request = transport.requests[0];
    expect(request.credentials).toBe("omit");
    expect(request.referrerPolicy).toBe("no-referrer");
    expect(new Headers(request.headers).has("authorization")).toBe(false);
    const form = request.body as FormData;
    expect([...form.keys()]).toEqual(["file", "metadata"]);
    const file = form.get("file") as File;
    expect(file.name).toBe("scorecard.png");
    expect(file.size).toBe(failed.image.size);
    const contents = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });
    expect(contents).toBe("failed image");
    expect(JSON.parse(form.get("metadata") as string)).toEqual({
      schema_version: 1, retry_key: failed.retryKey,
      category: "unreadable_scores", stage: "parse", http_status: 422,
    });
    expect("name" in failed.image).toBe(false);
  });

  it("does not claim success without a saved acknowledgement", async () => {
    const transport = new FakeReportTransport();
    transport.payload = { status: "queued" };
    await expect(createScanReportRepository(transport.send).submit(attempt())).rejects.toThrow(REPORT_NOT_SAVED);
  });

  it("makes missing storage explicit and never echoes server details", async () => {
    const transport = new FakeReportTransport();
    transport.status = 503;
    transport.payload = { code: "report_storage_unavailable", detail: "secret-user@example.com" };
    await expect(createScanReportRepository(transport.send).submit(attempt())).rejects.toThrow(REPORT_UNAVAILABLE);
    transport.payload = { detail: "secret-user@example.com" };
    await expect(createScanReportRepository(transport.send).submit(attempt())).rejects.toThrow(REPORT_NOT_SAVED);
    transport.offline = true;
    await expect(createScanReportRepository(transport.send).submit(attempt())).rejects.toThrow(REPORT_NOT_SAVED);
  });
});

describe("failure diagnostics", () => {
  it("copies safe fields without consuming the public error response", async () => {
    const response = Response.json({ detail: "private name", failure: {
      category: "unreadable_scores", stage: "parse", user_id: "secret",
    } }, { status: 422 });
    expect(await readScanFailure(response)).toEqual({ category: "unreadable_scores", stage: "parse", http_status: 422 });
    expect((await response.json()).detail).toBe("private name");
  });

  it("treats unknown or malformed diagnostics as a generic HTTP error", async () => {
    for (const response of [
      Response.json({ failure: { category: "secret-user" } }, { status: 500 }),
      new Response("<html>proxy failure</html>", { status: 500 }),
    ]) {
      expect(await readScanFailure(response)).toEqual({ category: "http_error", stage: "unknown", http_status: 500 });
    }
  });
});
