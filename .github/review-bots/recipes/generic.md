---
id: generic
title: Apply a review finding
when: (not offered to review bots — used only when a human replies `/fix` on a finding with no recipe)
setup: none
---

## When this applies

A human asked for a fix PR on a finding that has no matching recipe. There is
no worked example. The finding text and the surrounding code are the spec.

It does **not** apply when the finding is a design question, a request for a
new API, or anything that would need a product decision. In those cases change
nothing.

## The fix

1. Read the file and the lines around the finding.
2. Make the smallest change that addresses what the finding asked for.
3. Match the style of the neighbouring code. Do not introduce a new pattern.
4. Do not add tests, docs, or refactors unless the finding named them.

## Worked example

There is not one. Read the file the finding points at and do what it says.

## Done when

- [ ] The finding is addressed.
- [ ] No unrelated line changed.
