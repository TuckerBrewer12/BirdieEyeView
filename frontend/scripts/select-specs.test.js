import { beforeAll, describe, expect, it } from "vitest";
import { buildGraph, classifyChange, selectSpecs } from "./select-specs.mjs";

const context = { shell: new Map([["app/AppLayout.tsx", null]]), barrels: new Set(["brand/index.ts"]) };

describe("classifyChange", () => {
  it.each([
    [".github/workflows/screenshots.yml", "everything"],
    ["frontend/package-lock.json", "everything"],
    ["frontend/playwright.config.ts", "everything"],
    ["frontend/public/hero/card.jpg", "everything"],
    ["frontend/src/index.css", "everything"],
    ["frontend/src/brand/theme/tokens.ts", "everything"],
    ["frontend/src/brand/index.ts", "everything"],
    ["frontend/src/app/AppLayout.tsx", "everything"],
  ])("%s runs every spec", (file, effect) => {
    expect(classifyChange(file, context)).toHaveProperty(effect);
  });

  it.each([
    "api/main.py",
    "frontend/README.md",
    "frontend/eslint/specs.js",
    "frontend/android/app/build.gradle",
    "frontend/src/domain/tests/scoreTest.ts",
    "frontend/src/lib/api.test.ts",
  ])("%s runs nothing on its own", (file) => {
    expect(classifyChange(file, context)).toEqual({ nothing: true });
  });

  it("maps a baseline to the spec that takes it", () => {
    expect(
      classifyChange("frontend/src/pages/rounds/tests/RoundsPage.screenshot.spec.ts-snapshots/rounds-populated-desktop.png", context),
    ).toEqual({ file: "pages/rounds/tests/RoundsPage.screenshot.spec.ts" });
  });
});

describe("selectSpecs on this repo", () => {
  let graph;
  beforeAll(() => {
    graph = buildGraph();
  }, 60_000);

  it("runs a page's specs when a component it renders changes, and says through what", () => {
    const result = selectSpecs(graph, "screenshot", ["frontend/src/pages/rounds/components/LinkCoursePanel.tsx"]);
    const rounds = result.selected.find(({ spec }) => spec === "pages/rounds/tests/RoundsPage.screenshot.spec.ts");
    expect(rounds.reasons).toContainEqual(["pages/rounds/RoundsPage.tsx", "pages/rounds/components/LinkCoursePanel.tsx"]);
    expect(result.specs).not.toContain("pages/settings/tests/SettingsPage.screenshot.spec.ts");
  });

  it("runs a kit component's preview and the pages that use it", () => {
    const { specs } = selectSpecs(graph, "screenshot", ["frontend/src/brand/charts/HoleProfileChart.tsx"]);
    expect(specs).toContain("brand/tests/screenshots/charts/HoleProfileChart.screenshot.spec.ts");
    expect(specs).toContain("pages/courses/course-details/tests/CourseDetailPage.screenshot.spec.ts");
    expect(specs).not.toContain("pages/rounds/tests/RoundsPage.screenshot.spec.ts");
  });

  it("runs every spec for a piece of the shell", () => {
    expect(selectSpecs(graph, "ui", ["frontend/src/brand/components/SideNav.tsx"]).mode).toBe("all");
  });

  it("runs a spec whose own file or robot changed", () => {
    const { specs } = selectSpecs(graph, "ui", ["frontend/src/pages/scan/tests/ScanPage.robot.ts"]);
    expect(specs).toContain("pages/scan/tests/ScanPage.ui.spec.ts");
  });

  it("runs nothing when only a unit test changed", () => {
    expect(selectSpecs(graph, "ui", ["frontend/src/lib/userFacingErrors.test.ts"]).mode).toBe("none");
  });
});
