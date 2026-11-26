import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");

const WORK = process.env.PERF_WORK || "/tmp/bev-perf";
const RUNS = Number(process.env.RUNS || 9);
const SCENARIOS = (process.env.SCENARIOS || "landing,switch").split(",");
const SIDES = { base: "https://localhost:8443", pr: "https://localhost:8444" };
const PROFILES = {
  slow: { label: "Slow mobile (1.6 Mbps, 150 ms, 4× CPU)", down: 1.6e6, up: 750e3, latency: 150, cpu: 4 },
  fast: { label: "4G (9 Mbps, 60 ms, 4× CPU)", down: 9e6, up: 1.5e6, latency: 60, cpu: 4 },
};
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const MARKS = `
  window.__marks = {};
  window.__lcp = 0;
  const shown = (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0;
  const probes = {
    hero: () => { const h = document.querySelector("h1"); return !!h && !!h.textContent.trim() && shown(h); },
    photo: () => { const i = document.querySelector('img[alt^="A paper scorecard"]'); return !!i && i.complete && i.naturalWidth > 0 && shown(i); },
    dashboard: () => [...document.querySelectorAll('[aria-label^="Handicap"]')].some(shown),
    analytics: () => window.__watchAnalytics && [...document.querySelectorAll("p,span,div,dd,dt")]
      .some((e) => e.childElementCount === 0 && /^\\d+ rounds?$/.test(e.textContent.trim()) && shown(e)),
  };
  const tick = () => {
    for (const [name, probe] of Object.entries(probes)) {
      if (window.__marks[name] == null && probe()) window.__marks[name] = performance.now();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
`;

async function signIn() {
  const api = process.env.API || "http://127.0.0.1:8000";
  const res = await fetch(`${api}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "scheffler@example.com", password: "bench-password-123" }),
  });
  return (await res.json()).access_token;
}

async function openPage(context, profile) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: profile.latency, downloadThroughput: profile.down / 8, uploadThroughput: profile.up / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  await cdp.send("Performance.enable");
  let bytes = 0;
  cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
  const script = async () => (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "ScriptDuration").value * 1000;
  return { page, kb: () => bytes / 1000, script };
}

async function mark(page, name) {
  await page.waitForFunction((n) => window.__marks?.[n] != null, name, { timeout: 120000, polling: 50 });
  return page.evaluate((n) => window.__marks[n], name);
}

async function landing(context, url, profile) {
  const { page, kb, script } = await openPage(context, profile);
  await page.goto(url + "/", { waitUntil: "load", timeout: 120000 });
  const hero = await mark(page, "hero");
  const photo = await mark(page, "photo");
  await page.waitForTimeout(1500);
  const paint = await page.evaluate(() => ({
    fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime, lcp: window.__lcp,
  }));
  const result = { ...paint, hero, photo, script: await script(), kb: kb() };
  await page.close();
  return result;
}

async function run(browser, side, profile, scenario, token) {
  const context = await browser.newContext(PHONE);
  await context.addInitScript(MARKS);
  if (scenario === "landing") {
    const first = await landing(context, SIDES[side], profile);
    const repeat = await landing(context, SIDES[side], profile);
    await context.close();
    return { first, repeat };
  }
  await context.addInitScript((t) => localStorage.setItem("bev_access_token", t), token);
  const { page, kb, script } = await openPage(context, profile);
  await page.goto(SIDES[side] + "/", { waitUntil: "commit", timeout: 120000 });
  const result = { dashboard: await mark(page, "dashboard"), kb: kb(), script: await script() };
  await page.waitForTimeout(3000);
  const start = await page.evaluate(() => { window.__watchAnalytics = true; return performance.now(); });
  await page.getByRole("link", { name: "Analytics", exact: true }).locator("visible=true").first().click();
  result.switchMs = (await mark(page, "analytics")) - start;
  await context.close();
  return result;
}

const ROWS = {
  landing: [
    ["first visit: first contentful paint", "first.fcp"], ["first visit: hero visible", "first.hero"],
    ["first visit: hero photo shown", "first.photo"], ["first visit: largest contentful paint", "first.lcp"],
    ["first visit: script time", "first.script"], ["first visit: kB transferred", "first.kb"],
    ["repeat visit: hero visible", "repeat.hero"], ["repeat visit: script time", "repeat.script"],
  ],
  switch: [
    ["signed in, cold: dashboard handicap visible", "dashboard"], ["signed in, cold: script time", "script"],
    ["signed in, cold: kB transferred", "kb"], ["dashboard → Analytics: round count visible", "switchMs"],
  ],
};

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const cell = (xs) => `${median(xs).toFixed(0)} (${Math.min(...xs).toFixed(0)}–${Math.max(...xs).toFixed(0)})`;
const pick = (rs, field) => rs.map((r) => field.split(".").reduce((o, k) => o[k], r));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: [
    "--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND",
    `--ignore-certificate-errors-spki-list=${fs.readFileSync(`${WORK}/spki.txt`, "utf8").trim()}`,
  ],
});
const token = SCENARIOS.includes("switch") ? await signIn() : null;
const results = {};
for (const [name, profile] of Object.entries(PROFILES)) {
  for (const scenario of SCENARIOS) {
    const runs = (results[`${name}/${scenario}`] = { base: [], pr: [] });
    for (let i = 0; i <= RUNS; i++) {
      for (const side of i % 2 ? ["pr", "base"] : ["base", "pr"]) {
        const result = await run(browser, side, profile, scenario, token);
        if (i > 0) runs[side].push(result);
      }
    }
  }
}
await browser.close();
fs.writeFileSync(process.env.OUT || "perf.json", JSON.stringify(results, null, 2));

for (const [name, profile] of Object.entries(PROFILES)) {
  console.log(`\n### ${profile.label}\n\n| | base | PR |\n|---|---|---|`);
  for (const scenario of SCENARIOS) {
    const runs = results[`${name}/${scenario}`];
    for (const [label, field] of ROWS[scenario]) console.log(`| ${label} | ${cell(pick(runs.base, field))} | **${cell(pick(runs.pr, field))}** |`);
  }
}
