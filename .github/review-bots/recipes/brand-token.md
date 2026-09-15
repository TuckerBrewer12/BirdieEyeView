---
id: brand-token
title: Replace a hardcoded color with a brand token
when: The diff adds a literal color — hex, rgb(), hsl(), or a Tailwind color class — in frontend/src/ where a token from the brand theme or lib/colors already carries that meaning.
setup: frontend
verify: cd frontend && npm run typecheck
---

## When this applies

A line the diff adds writes a color value directly instead of reading it from a
token. Dark mode and the color-blind palettes are both driven by the tokens, so
a literal is a component that silently stops responding to either.

The two token sources, both acceptable — the migration to the brand kit is still
in progress:

- `frontend/src/brand/theme/colors.ts`, reached through `useTheme()` or the
  `colors` object. Preferred for anything inside a component's own markup.
- `frontend/src/lib/colors.ts` — `SCORE_COLORS`, `UI_COLORS`, `getScoreColor()`.
  Still the right source for charts and anything going through
  `getColorBlindPalette()`.

It does **not** apply to:

- `transparent`, `currentColor`, `inherit`, or `none`;
- `rgba(0,0,0,0.…)` used purely as a shadow or scrim, where no token exists;
- gradient stops in decorative section backgrounds that the design system spells
  out literally (see the background list in `CLAUDE.md`);
- test files, snapshot fixtures, and `previews/`;
- a genuinely new color with no token equivalent. In that case the fix is to add
  the token first — which is a design decision, not a mechanical one. Leave a
  note instead of guessing.

## The fix

1. **Find the token that means what the literal means.** Match on role, not on
   the hex digits: `#2d7a3a` is `primary` because it is the primary action
   color, and the fix is wrong if the value happens to match but the meaning
   does not. The map for the common ones:

   | Literal | Token | Reached by |
   | --- | --- | --- |
   | `#2d7a3a` | `primary` | `theme.primary` / `UI_COLORS.primary` |
   | `#ffffff` on a primary surface | `onPrimary` | `theme.onPrimary` |
   | `#f8faf8` page background | `page` | `theme.page` |
   | `white` card background | `card` | `theme.card` |
   | `#e5e7eb` / `#e4e9e1` hairline | `border` | `theme.border` |
   | muted body text | `fgMuted` | `theme.fgMuted` |
   | body text | `fg` | `theme.fg` |
   | birdie / bogey / par etc. | `score.<type>.{fill,onFill,text}` | `theme.score` / `SCORE_COLORS` |

2. **Import from the barrel.** `import { useTheme } from "@/brand"` (or
   `"@/brand/theme"` from inside the kit). If the component already calls
   `useTheme()`, reuse that `theme` — do not call it twice.

3. **Replace the literal**, and only that literal. Do not restyle the element,
   do not convert inline styles to Tailwind or back, do not touch adjacent
   lines that were already there.

4. **A Tailwind color class is the same finding.** `text-gray-500` inside a kit
   component becomes `style={{ color: theme.fgMuted }}` — the kit styles inline
   so one token drives light and dark. Outside the kit, prefer the smallest
   change that removes the literal.

5. **Score colors keep going through the helpers.** If the value is a score
   color used in a chart, call `getScoreColor(key, palette)` or `scoreFill()`
   rather than reading `SCORE_COLORS` directly, so the color-blind override
   still applies.

## Worked example

Before — a chip that hardcodes the brand green and a gray:

```tsx
export function StatusChip({ label, active }: StatusChipProps) {
  return (
    <span
      style={{
        padding: "5px 11px",
        borderRadius: 99,
        border: `1px solid ${active ? "#2d7a3a" : "#e4e9e1"}`,
        background: active ? "#2d7a3a" : "#ffffff",
        color: active ? "#ffffff" : "#6b7765",
      }}
    >
      {label}
    </span>
  );
}
```

After — the same markup, four literals replaced, dark mode now free:

```tsx
import { useTheme } from "@/brand/theme";

export function StatusChip({ label, active }: StatusChipProps) {
  const theme = useTheme();

  return (
    <span
      style={{
        padding: "5px 11px",
        borderRadius: 99,
        border: `1px solid ${active ? theme.primary : theme.border}`,
        background: active ? theme.primary : theme.card,
        color: active ? theme.onPrimary : theme.fgMuted,
      }}
    >
      {label}
    </span>
  );
}
```

This is exactly the shape of the real `FilterChip` in
`frontend/src/brand/components/FilterChip.tsx` — read it if the mapping is
unclear. Note that `#ffffff` mapped to two different tokens depending on where it
sat: `onPrimary` as text on the green fill, `card` as the resting background.
That is the whole point of matching on role.

## Done when

- [ ] The literal the finding pointed at is gone.
- [ ] The replacement token means the same thing the literal meant, not merely
      the same RGB.
- [ ] `useTheme()` is called once per component.
- [ ] No other line in the file changed.
- [ ] `npm run typecheck` passes.
