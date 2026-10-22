# Lint rules proposal

Rules to catch, at lint time, the mistakes AI-written PRs keep making and review bots keep
flagging after the push. Built from every PR comment and review (~1,200), the 134 bot fix PRs,
the owner's own review comments and saved preferences, and the fix history on `main`.

`[x]` is in the MVP draft PR. `[ ]` is proposed, not built yet. Counts are violations on the
branch today; per repo policy, rules land failing and the violations get fixed, with no
exemption lists.

## What the history shows

- **Hard-coded design values are ~76% of bot fixes** (94 of 124 real fix PRs). Most were numbers
  (motion timings, inline `style` sizes, SVG/Recharts props) that #331's string-only rules
  never see.
- **Golf logic in views:** to-par branches, `strokes - par`, `round.par ?? round.course?.par` (#352).
- **Wrong test kind:** pixels in espresso specs, `vi.fn()` mocks, `capture()` with no
  visible-state wait, kit components with no preview or screenshot spec.
- **Hand-rolled kit parts:** a raw `<button>` instead of ToggleGroup (#306, #360), a local
  `function Stat` (#354), a second `Stat.tsx` (#332).
- **Backend:** endpoints that never used `current_user` (IDOR, f2092b9), exception text sent to
  clients, `except Exception` turning DB failures into 404s (b63cc0b), naive datetimes (#347).
- **Churn:** about half of the bot's comments repeat the same finding on every push, and bot
  fixes often swapped in the *nearest* token, which changed the look. Messages say "add a
  token", not "use the closest one".

## 1. Gaps in #331's rules

- [x] `kit/no-color-literal` flags `white`/`black` (`bg-white`, `text-white/90`): 1 today; #232
      had nine
- [x] `kit/no-opacity-wash`: `bg-score-birdie/10`, `from-primary/8`, `to-55%`: 82 today
      (mostly stock shadcn variants in the kit)
- [x] `kit/no-fraction-size`: `h-7/25` (#315): 0 today
- [x] `golf/*` sees through `??`/`||`, casts and `x.strokes[i]` (#219, #256)
- [x] `golf/no-golf-math` flags strokes vs par comparisons (#257): 1 today
- [x] `golf/no-par-fallback`: `round.par ?? round.course?.par` (#352): 0 today
- [x] kit.js exports `COLOR_LITERAL` for `tokens.test.ts` to share
- [ ] Switch `tokens.test.ts` to the shared `COLOR_LITERAL` (its copy has already drifted: no
      `color-mix`)
- [ ] Decide on non-length brackets (`grid-cols-[…]`, `aspect-[4/3]`): the rule allows them,
      the bot flags them

## 2. Numbers that skip tokens (`eslint/kit-numbers.js`)

- [x] `kit/no-raw-motion`: `duration`/`scale`/`damping`/… numbers in motion props, spring
      objects and timing tables (allows 0 and 1): 23 today; ~26 fix PRs
- [x] `kit/no-style-measure`: sizes and colours in `style={{}}`: 122 today, all in
      `MobileDashboard.tsx`; ~22 fix PRs
- [x] `kit/no-measure-prop`: `strokeWidth`, `rx`, `innerRadius`, `strokeDasharray`,
      `stopOpacity`, lucide `size`, …: 53 today; ~14 fix PRs
- [x] No raw `<button>`/`<input>`/`<select>`/`<textarea>` outside `brand/components`: 9 today
- [ ] `kit/no-shadowed-kit-component`: a local component named like a kit export (`Stat`, `Chip`)
- [ ] `tokens.test.ts` checks every number in `chartLayout` against a token (#333–338)
- [ ] Decide on icon geometry: `HoleScoreShapes` (12) and checkmark paths are viewBox units, not
      chart measures

## 3. Owner preferences, enforced

- [x] No `@/components` imports from refactored code: 2 today (`DashboardPage.tsx:5`,
      `RoundDetailPage.tsx:20`)
- [x] Colour-blind mode: ban `colorBlind*` names and `@/lib/accessibility`/`chartPalettes`
      imports: 127 + 14 today (feature removal); stale CLAUDE.md line rewritten
- [x] Theme is CSS: ban `useTheme().resolved` and `classList.contains('dark')`: 2 today
- [x] `test:screenshots:update` uses `--update-snapshots=all`
- [x] Kit and page components don't import `@/types/api`/`@/types/golf`: 12 today
- [x] Every `eslint-disable` needs a reason; unused disables are errors: 4 today
- [ ] View models don't own server state: ban `@/lib/api`, `setQueryData`, `invalidateQueries`
      in `use*ViewModel.ts`
- [ ] Fail PRs that touch `frontend/src` and target `main` (#168, #173, #177). Held back:
      contributors still open legit frontend PRs to `main`

## 4. Views and tests

- [x] No `.sort()`/chained array steps, `!`, or `toFixed`/`Math.round` in refactored JSX: 8 today
- [x] Espresso specs can't check pixels (`toHaveScreenshot`, `toHaveCSS`, `capture`,
      `getComputedStyle`): 0 today
- [x] `specs/full-page-capture`: page robots shoot the whole page: 1 today
      (`SettingsPage.robot.ts:74`)
- [x] `specs/capture-after-sees`: `capture()` follows a `sees*()` wait: 8 today (#232's fix
      never landed)
- [x] Page Vitest tests use `renderHook`, not `render`/`screen`/storage globals: 3 today
- [x] No `vi.fn`/`vi.mock`/`vi.spyOn` in Vitest tests: 1 today
- [x] `eslint-plugin-playwright` recommended, with robot steps counted as assertions: 3 today,
      including a real one (an espresso test that never asserts)
- [x] `scripts/ci/check_frontend_conventions.py`: kit component → preview + screenshot spec;
      page → robot + screenshot + espresso; view model → test; no unlabelled specs; unique kit
      exports: 1 today (`useTryItYourselfViewModel`)
- [ ] Screenshot specs assert looks only: follow robot methods and fail on behaviour assertions
- [ ] View models don't paint: no `format*`/`*Label` imports or template-literal returns
- [ ] Coverage floor for `use*ViewModel.ts`
- [ ] Make `screenshots.yml` a required check (stale snapshots, #325)

## 5. Off-the-shelf tooling (frontend)

- [x] tsconfig: `noImplicitOverride`, `noImplicitReturns`, `allowUnreachableCode: false`,
      `allowUnusedLabels: false`: 0 today
- [x] Typed lint: `no-floating-promises` (9), `no-misused-promises` (37),
      `switch-exhaustiveness-check` (0), `strict-boolean-expressions` for nullable numbers
      only (37, where 0 is treated as missing)
- [x] `eslint-plugin-jsx-a11y` recommended: 27 today
- [x] knip in CI (unused files, dependencies, binaries): 11 dead files, 4 unused dependencies
      (`motion` duplicates `framer-motion`; check the Capacitor plugins before removing them)
- [x] No `fetch(apiUrl(…))` outside `lib/api.ts`: 3 today
- [ ] `noUncheckedIndexedAccess`: 141 errors, mostly `holes[i]` indexing (breaks `npm run build`
      until fixed)
- [ ] `exactOptionalPropertyTypes` (33), `noPropertyAccessFromIndexSignature` (76)
- [ ] `no-unnecessary-condition`, `no-deprecated`, `no-unnecessary-type-assertion`
- [ ] knip unused exports (needs entry config for the `@/brand` and `@/domain` barrels)
- [ ] `eslint-plugin-testing-library`, `@vitest/eslint-plugin`
- [ ] `eslint-plugin-better-tailwindcss` in place of the palette regex, if it supports Tailwind
      v4: reads `cn()`/`cva()` and flags classes the theme doesn't generate

## 6. Backend

- [x] Ruff: `ARG`, `BLE001`, `DTZ`, `ASYNC`, `TID251` (bans `requests`, `time.sleep`),
      `SLF001`, `RUF`, `PGH003/004`, `ERA001`, `T20`, `FAST001/003`; un-ignore `B904`: 99 today
      (B904 25, DTZ 35, RUF100 10)
- [x] `scripts/ci/check_backend_conventions.py`: `str(e)` in `HTTPException` detail (9 today),
      hard-coded hole counts 9/18 (38 today; the 9-hole bug in #284)
- [ ] Pin ruff in CI so counts don't move between versions
- [ ] Pyright blocking for production directories once its 40 errors there are fixed
- [ ] Test that request-model `Field(ge/le)` bounds match `schema.sql` CHECK constraints
- [ ] squawk on migrations (`prefer-timestamptz`: all 18 timestamp columns are `TIMESTAMP`)
- [ ] Junk-file check (`.DS_Store`, `.coverage`, `stuff.txt` are tracked on `main`)
- [ ] `main` lacks the `dump_openapi.py --check` API drift step

## Left to review bots

- Where formatting lives: #283 reversed the rule (views paint), so older findings disagree.
- Which flows need a spec; drift between mobile and desktop versions of a screen.
- Whether something belongs in the kit; backend parsing heuristics.
