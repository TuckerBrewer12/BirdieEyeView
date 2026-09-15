---
id: view-model-extraction
title: Move logic out of a page view and into its view model
when: The diff computes, maps, filters, branches, or formats inside a page's JSX instead of having use<Page>ViewModel hand the view a finished value.
setup: frontend
verify: cd frontend && npm run typecheck && npm test
---

## When this applies

Pages in this app are MVVM. `use<Page>ViewModel.ts` holds all state and
derivation; `<Page>.tsx` renders what it is handed and nothing more. The
reference implementation is `frontend/src/pages/RoundsPage/`:

```
frontend/src/pages/RoundsPage/
├── RoundsPage.tsx              the view
├── useRoundsPageViewModel.ts   the view model
├── index.ts                    re-export
└── tests/                      robot + screenshot spec
```

This applies when a line the diff adds puts derivation in the view: a `.map()`
that builds labels, a ternary chain picking display text, a `.filter()` on raw
data, a date or score formatter called inline, a label lookup table defined
next to the JSX.

It does **not** apply to:

- rendering-only conditionals — `{loading ? <Spinner /> : <List />}`, or
  `{items.length === 0 && <Empty />}`;
- `.map()` over an already-finished array, which is what the view is *for*;
- layout arithmetic that only means something in pixels;
- components outside `frontend/src/pages/` that are not part of a page triple.

## The fix

1. **Name the finished value the view actually wants.** Not `rawRounds` plus a
   formatter, but `chips`, `sortedRounds`, `summaryLine` — the thing the JSX
   would render directly.
2. **Move the computation into the view model**, keeping it memoized in the same
   style as the neighbours in that file (`useMemo` with the real dependency list).
3. **Expose it from the view model's return object**, alongside the existing
   fields, and type it explicitly if the file types its return.
4. **Reduce the JSX to a read.** The view should mention the value's name and
   nothing about how it was built.
5. **Handle both twins.** Where the page has paired `Mobile*` / `*Desktop*`
   components, they share one view model and differ only in JSX. Extract once
   and use it from both — never fix one twin and leave the other computing the
   same thing inline.
6. **One source of truth.** If the same table or rule now exists on both sides,
   delete the view's copy. That duplication is the actual bug this prevents.

## Worked example

Before — the view builds the chip list, decides which is active, and owns the
label table:

```tsx
export function RoundsPage({ userId }: RoundsPageProps) {
  const viewModel = useRoundsPageViewModel(userId);

  return (
    <FilterChipRow>
      {(["l20", "best", "course"] as const).map((mode) => (
        <FilterChip
          key={mode}
          label={mode === "l20" ? "Last 20" : mode === "best" ? "Best" : "By course"}
          active={viewModel.filterMode === mode}
          onClick={() => viewModel.setFilterMode(viewModel.filterMode === mode ? "all" : mode)}
        />
      ))}
    </FilterChipRow>
  );
}
```

After — the view model hands over finished chips, which is what
`frontend/src/pages/RoundsPage/` does today:

```ts
// useRoundsPageViewModel.ts
const chips = useMemo(
  () =>
    FILTER_MODES.map((mode) => ({
      key: mode.key,
      mode: mode.key,
      label: mode.label,
      active: filterMode === mode.key,
    })),
  [filterMode],
);

return { /* …existing fields… */ chips, setFilterMode };
```

```tsx
// RoundsPage.tsx
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

The label table now lives in one place, `active` is decided once, and swapping
the mobile view in later costs nothing.

## Done when

- [ ] The computation the finding pointed at is in the view model, memoized.
- [ ] The view reads a named value and does not reconstruct it.
- [ ] No label table, mapping, or formatting rule exists on both sides.
- [ ] Both `Mobile*`/`*Desktop*` twins, where they exist, use the extracted value.
- [ ] Rendered output is unchanged — this is a move, not a redesign.
- [ ] `npm run typecheck` and `npm test` pass.
