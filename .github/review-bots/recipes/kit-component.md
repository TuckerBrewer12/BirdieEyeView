---
id: kit-component
title: Swap hand-rolled UI for the brand kit component that already does it
when: The diff hand-rolls a button, chip, banner, panel, search input, page title, or sort control that frontend/src/brand/components/ already provides.
setup: frontend
verify: cd frontend && npm run typecheck && npm run lint -- --max-warnings=0
---

## When this applies

A page or feature component builds a piece of UI from scratch that the kit
already exports. The kit is the single place light/dark and spacing are decided;
a hand-rolled twin drifts from it within a release or two.

The kit, as of now:

| Component | Import | Replaces |
| --- | --- | --- |
| `Button` | `@/brand` | `<button>` with padding/radius/variant styling |
| `FilterChip`, `FilterChipRow` | `@/brand` | pill toggles, filter rows |
| `SearchField` | `@/brand` | text input with a search icon/placeholder |
| `SortControl` | `@/brand` | sort direction/field toggle |
| `PageTitle` | `@/brand` | large page heading |
| `Panel` | `@/brand` | bordered card surface |
| `ErrorBanner` | `@/brand` | inline error/alert strip |
| `RoundPreview` | `@/brand` | round summary row |
| `CourseLinkSearch`, `CourseLinkChip`, `CustomNameChip` | `@/brand/components/…` | course-linking UI |

Read the component before swapping. If the existing markup needs a prop the kit
component does not have, this recipe does **not** apply — widening a kit
component's API is a design decision. Say so instead of forcing the swap.

It also does not apply when the hand-rolled element is deliberately different
(a one-off marketing surface, a chart-internal control), or when the swap would
change behavior rather than just appearance.

## The fix

1. **Read the kit component** and its props. `frontend/src/brand/components/<Name>.tsx`.
2. **Read its preview** — `frontend/src/brand/previews/<Name>.tsx` shows the
   intended usage in four lines, which is usually faster than reading the props.
3. **Replace the markup** with the kit component, mapping existing handlers and
   labels onto its props.
4. **Delete what the kit now owns** — the inline style object, the local
   `className` soup, any local `active`/`hover` styling the component handles
   itself. Leave layout that belongs to the parent (grid placement, margins)
   where it is.
5. **Import from the barrel.** `import { Button, FilterChip } from "@/brand";`
   — one import, merged with any existing `@/brand` import in the file.
6. **Do not change behavior.** Same click handlers, same conditions, same order.
   If the kit component renders a `<button type="button">` and the original was
   a submit button inside a form, that is a behavior change — stop and say so.

## Worked example

Before — `RoundsPage` hand-rolling its filter pills:

```tsx
<div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
  {modes.map((mode) => (
    <button
      key={mode.key}
      type="button"
      onClick={() => setFilterMode(mode.key)}
      style={{
        padding: "5px 11px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${mode.key === filterMode ? "#2d7a3a" : "#e4e9e1"}`,
        background: mode.key === filterMode ? "#2d7a3a" : "#fff",
        color: mode.key === filterMode ? "#fff" : "#6b7765",
      }}
    >
      {mode.label}
    </button>
  ))}
</div>
```

After — what `frontend/src/pages/RoundsPage/RoundsPage.tsx` actually contains:

```tsx
import { FilterChip, FilterChipRow } from "@/brand";

<FilterChipRow>
  {viewModel.chips.map((chip) => (
    <FilterChip
      key={chip.key}
      label={chip.label}
      active={chip.active}
      onClick={() => viewModel.setFilterMode(chip.active ? "all" : chip.mode)}
    />
  ))}
</FilterChipRow>
```

Twenty lines to seven, the colors come from the theme, and dark mode works. Note
that the `active` computation moved to the view model rather than staying in the
JSX — if the finding is on a page, check whether the surrounding page follows
MVVM (see the `view-model-extraction` recipe) and keep the derived state on the
view-model side.

## Done when

- [ ] The hand-rolled markup is gone and the kit component renders in its place.
- [ ] Every prop the original supported is wired through; nothing silently dropped.
- [ ] The import comes from `@/brand`, merged into the file's existing one.
- [ ] No hardcoded colors are left behind from the old markup.
- [ ] `npm run typecheck` and `npm run lint -- --max-warnings=0` pass.
