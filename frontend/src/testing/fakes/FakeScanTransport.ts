/** A controllable extraction boundary for testing late scan responses. */
export class FakeScanTransport {
  private pending: ((response: Response) => void)[] = [];
  readonly reports: FormData[] = [];

  send: typeof fetch = async (url, options) => {
    if (String(url).endsWith("/ocr")) return Response.json({ ocr_text: "scorecard" });
    if (String(url).endsWith("/reports")) {
      this.reports.push(options?.body as FormData);
      return Response.json({ status: "saved" });
    }
    if (String(url).endsWith("/extract")) return new Promise((resolve) => this.pending.push(resolve));
    return Response.json({});
  };

  failNext() {
    this.pending.shift()?.(Response.json({
      detail: "Unable to read score rows.", failure: { category: "unreadable_scores", stage: "parse" },
    }, { status: 422 }));
  }
}
