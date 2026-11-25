import { describe, expect, it } from "vitest";

import { firstLoadAssets } from "./first-load-assets.mjs";

const builtToday = `<!doctype html>
<html lang="en">
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans&display=swap" rel="stylesheet">
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <script>
      (function () { document.documentElement.classList.toggle("dark", false); })();
    </script>
    <script type="module" crossorigin src="/assets/index-DRpneyDX.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CChUZK6-.css">
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("firstLoadAssets", () => {
  it("finds the entry module and stylesheet of today's build, and skips the font host and inline script", () => {
    expect(firstLoadAssets(builtToday)).toEqual({
      js: ["dist/assets/index-DRpneyDX.js"],
      css: ["dist/assets/index-CChUZK6-.css"],
    });
  });

  it("counts each chunk Vite preloads with the entry once", () => {
    const split = `
      <script type="module" crossorigin src="/assets/index-AAAA.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-BBBB.js">
      <link rel="modulepreload" crossorigin href="/assets/vendor-BBBB.js">
      <link rel="stylesheet" crossorigin href="/assets/index-CCCC.css">`;

    expect(firstLoadAssets(split).js).toEqual(["dist/assets/index-AAAA.js", "dist/assets/vendor-BBBB.js"]);
  });

  it("reads single-quoted, unquoted and relative paths, under the given folder", () => {
    const html = `<script src='./assets/a.js' type=module></script><link href=assets/a.css rel=stylesheet>`;

    expect(firstLoadAssets(html, "build")).toEqual({ js: ["build/assets/a.js"], css: ["build/assets/a.css"] });
  });

  it("leaves out classic scripts and other hosts' modules", () => {
    const html = `
      <script src="/legacy.js"></script>
      <script type="module" src="https://cdn.example.com/x.js"></script>
      <script type="module" src="//cdn.example.com/y.js"></script>`;

    expect(firstLoadAssets(html).js).toEqual([]);
  });
});
