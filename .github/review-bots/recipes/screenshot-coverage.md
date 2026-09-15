---
id: screenshot-coverage
title: Add preview + screenshot coverage for a brand kit component
when: The diff adds or renames a component in frontend/src/brand/components/ that has no matching file in frontend/src/brand/previews/ or no spec in frontend/src/brand/tests/screenshots/.
setup: frontend-playwright
verify: cd frontend && npx playwright test src/brand/tests/screenshots --project=desktop --update-snapshots
---

## When this applies

Every component in `frontend/src/brand/components/` is covered by exactly three
files:

```
frontend/src/brand/components/<Name>.tsx              the component
frontend/src/brand/previews/<Name>.tsx                one static arrangement of it
frontend/src/brand/tests/screenshots/<Name>.screenshot.spec.ts   light + dark capture
```

This recipe applies when the first exists and either of the other two does not.

It does **not** apply to:

- components outside `frontend/src/brand/components/` — page components are
  covered by page-level screenshot specs instead (see
  `frontend/src/pages/RoundsPage/tests/`), which is a different shape;
- a sub-component exported from a file that already has the other two (e.g.
  `FilterChipRow` lives in `FilterChip.tsx` and is covered by the `FilterChip`
  preview — one preview per file, not per export);
- a pure-logic or type-only module that happens to live under `components/`.

## The fix

1. **Read the component** and note its props, which ones are required, and which
   states are visually distinct (variant, active/inactive, disabled, error, long
   text that wraps).

2. **Write `previews/<Name>.tsx`.** Default export, named `<Name>Preview`, no
   props, no state, no data fetching, no `Math.random`, no `new Date()`. It
   renders the component with fixed props, once per visually distinct state.
   Handlers are `() => {}`. The harness (`BrandHarness.tsx`) already supplies a
   themed 390px-wide flex column with `gap: 12`, so the preview renders bare
   children — do not add your own wrapper, padding, or background. Where the
   component has a natural container component in the same file (a `*Row`), use
   it. The preview is picked up automatically by the harness's
   `import.meta.glob("./previews/*.tsx")`; there is no registry to edit.

3. **Write `tests/screenshots/<Name>.screenshot.spec.ts`.** Copy the shape below
   verbatim and change only the describe title, the preview name, and the file
   names. The preview name argument must match the previews filename stem
   exactly — that is the harness route. Screenshot file names are the component
   name in kebab-case, `.png`, plus `-dark` for the dark test.

4. **Generate the baselines.** `verify` above runs Playwright with
   `--update-snapshots`, which writes
   `tests/screenshots/<Name>.screenshot.spec.ts-snapshots/<name>[-dark]-desktop-darwin.png`.
   Commit those PNGs. Do not hand-write, crop, or edit them, and do not touch
   the baselines of any other component.

5. **Export the component** from `frontend/src/brand/index.ts` if it is meant for
   use outside the kit and is not exported yet.

## Worked example

`FilterChip` — the component that already exists, and the two files that cover it.

`frontend/src/brand/components/FilterChip.tsx` (already in the repo, shown for
context — two exports, one preview):

```tsx
import type { ReactNode } from "react";
import { useTheme } from "@/brand/theme";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  const theme = useTheme();
  // …styles driven by `active`…
}

export function FilterChipRow({ children }: { children: ReactNode }) {
  // …horizontal scroller…
}
```

`frontend/src/brand/previews/FilterChip.tsx` — covers active and inactive, and
one label long enough to prove the row scrolls rather than wraps:

```tsx
import { FilterChip, FilterChipRow } from "@/brand/components/FilterChip";

export default function FilterChipPreview() {
  return (
    <FilterChipRow>
      <FilterChip label="All" active onClick={() => {}} />
      <FilterChip label="L20" active={false} onClick={() => {}} />
      <FilterChip label="Best" active={false} onClick={() => {}} />
      <FilterChip label="Half Moon Bay" active={false} onClick={() => {}} />
    </FilterChipRow>
  );
}
```

`frontend/src/brand/tests/screenshots/FilterChip.screenshot.spec.ts` — every
spec in the directory is this file with three strings changed:

```ts
import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("FilterChip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "FilterChip", "filter-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "FilterChip", "filter-chip-dark.png");
  });
});
```

A second example of the same shape, for a component whose preview needs several
variants rather than a row — `frontend/src/brand/previews/Button.tsx`:

```tsx
import { Button } from "@/brand/components/Button";

export default function ButtonPreview() {
  return (
    <>
      <Button variant="primary">Save</Button>
      <Button>Load more</Button>
      <Button block>Load more (12 remaining)</Button>
      <Button disabled>Disabled</Button>
    </>
  );
}
```

Note the fragment: the harness stage is already a flex column, so variants stack
with the right gap without a wrapper.

## Done when

- [ ] `previews/<Name>.tsx` exists, default-exports `<Name>Preview`, takes no
      props, and is deterministic — same pixels on every run.
- [ ] `tests/screenshots/<Name>.screenshot.spec.ts` exists with a `light` and a
      `dark` test, matching the shape above.
- [ ] Two new PNGs exist under
      `<Name>.screenshot.spec.ts-snapshots/`, generated by Playwright.
- [ ] No other component's baseline PNG changed.
- [ ] `npx playwright test src/brand/tests/screenshots --project=desktop` passes
      with the new baselines in place.
