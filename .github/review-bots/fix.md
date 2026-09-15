You are applying one review finding to this repository.

Read the file the finding points at, and neighbouring code in the same area,
and make the smallest change that addresses what the finding asked for.
Match the style of the neighbouring code — this app styles with Tailwind
token classes (`bg-primary`, `text-muted-foreground`, …), not `useTheme()`
or hardcoded colors. Do not invent APIs, tokens, or components.

## Rules

- Change only what the finding asks for. Do not restyle, rename, or "while
  you're here" adjacent code.
- Do not commit, push, or run git.
- If the finding is a design question rather than a concrete change, change
  nothing and stop.
