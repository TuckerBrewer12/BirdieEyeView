#!/usr/bin/env python3
"""Fix recipes — this repo's written-down answer to a recurring review finding.

A recipe is a markdown file in `recipes/` with a small front matter block. Two
consumers:

* the review bots get the *catalog* (id + `when`) in their prompt, so a finding
  can be tagged with the recipe that fixes it;
* the fix bot gets the *whole file* as the instructions for the change.

Front matter is `key: value` lines only — no YAML dependency on the runner.

CLI:
    recipes.py catalog             # markdown catalog for a review prompt
    recipes.py body <id>           # full recipe text, front matter stripped
    recipes.py field <id> <key>    # one resolved value ('' if unset)
    recipes.py info <id>           # JSON: id, title, setup, verify, runner
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from functools import cache
from pathlib import Path

RECIPES_DIR = Path(__file__).resolve().parent / "recipes"

# The catch-all used when a finding has no recipe. Deliberately not offered to
# the review bots — tagging everything `generic` would tell the fix bot nothing.
FALLBACK_ID = "generic"

# Snapshot filenames include the OS (`-darwin` vs `-linux`), so Playwright
# coverage has to run on the same runner as `.github/workflows/screenshots.yml`.
PLAYWRIGHT_RUNNER = "macos-latest"
DEFAULT_RUNNER = "ubuntu-latest"


@dataclass(frozen=True)
class Recipe:
    id: str
    meta: dict[str, str]
    body: str

    @property
    def title(self) -> str:
        return self.meta.get("title", self.id)

    @property
    def when(self) -> str:
        return self.meta.get("when", "")

    @property
    def setup(self) -> str:
        """Runner prep the fix needs: none | frontend | frontend-playwright."""
        return self.meta.get("setup", "none") or "none"

    @property
    def verify(self) -> str:
        """Shell command the fix bot runs from the repo root after editing."""
        return self.meta.get("verify", "")


def runner_for(setup: str) -> str:
    return PLAYWRIGHT_RUNNER if setup == "frontend-playwright" else DEFAULT_RUNNER


def _parse(path: Path) -> Recipe:
    text = path.read_text()
    meta: dict[str, str] = {}
    body = text

    if text.startswith("---\n"):
        end = text.find("\n---\n", 3)
        if end != -1:
            for line in text[4:end].splitlines():
                key, sep, value = line.partition(":")
                if sep:
                    meta[key.strip()] = value.strip()
            body = text[end + len("\n---\n") :]

    return Recipe(id=path.stem, meta=meta, body=body.strip())


@cache
def all_recipes() -> tuple[Recipe, ...]:
    return tuple(_parse(p) for p in sorted(RECIPES_DIR.glob("*.md")) if p.stem != "README")


def load(recipe_id: str | None) -> Recipe:
    """Return the named recipe, falling back to `generic` for anything unknown."""
    wanted = (recipe_id or "").strip()
    for recipe in all_recipes():
        if recipe.id == wanted:
            return recipe
    for recipe in all_recipes():
        if recipe.id == FALLBACK_ID:
            return recipe
    raise FileNotFoundError(f"no recipe '{wanted}' and no '{FALLBACK_ID}' fallback in {RECIPES_DIR}")


def known_ids() -> frozenset[str]:
    """Recipe ids a review bot is allowed to tag. Excludes the generic fallback."""
    return frozenset(recipe.id for recipe in all_recipes() if recipe.id != FALLBACK_ID)


def info(recipe: Recipe) -> dict[str, str]:
    return {
        "id": recipe.id,
        "title": recipe.title,
        "setup": recipe.setup,
        "verify": recipe.verify,
        "runner": runner_for(recipe.setup),
    }


def field(recipe: Recipe, key: str) -> str:
    if key == "setup":
        return recipe.setup
    if key == "verify":
        return recipe.verify
    if key == "title":
        return recipe.title
    if key == "runner":
        return runner_for(recipe.setup)
    if key == "when":
        return recipe.when
    return recipe.meta.get(key, "")


def catalog() -> str:
    """The recipe menu a review bot sees — ids it may tag a finding with."""
    lines = [
        "## Fix recipes",
        "",
        "These are the findings this repo already knows how to fix automatically.",
        "If one of yours matches, add `\"recipe\": \"<id>\"` to it and a PR that",
        "implements the change will be opened against this branch. If none matches,",
        "leave `recipe` out — do not stretch a finding to fit a recipe.",
        "",
    ]
    for recipe in all_recipes():
        if recipe.id == FALLBACK_ID:
            continue
        lines.append(f"- `{recipe.id}` — {recipe.when or recipe.title}")
    return "\n".join(lines) + "\n"


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__, file=sys.stderr)
        return 2

    command = args[0]
    if command == "catalog":
        print(catalog(), end="")
    elif command == "body" and len(args) == 2:
        print(load(args[1]).body)
    elif command == "field" and len(args) == 3:
        print(field(load(args[1]), args[2]))
    elif command == "info" and len(args) == 2:
        json.dump(info(load(args[1])), sys.stdout)
        print()
    else:
        print(__doc__, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
