from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CI_SCRIPTS = ROOT / "scripts" / "ci"
if str(CI_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(CI_SCRIPTS))

from check_frontend_conventions import find_problems

COVERED = {
    "brand/components/Stat.tsx": "export { Stat, StatLabel };",
    "brand/previews/components/Stat.tsx": "export default function StatPreview() {}",
    "brand/tests/screenshots/components/Stat.screenshot.spec.ts": "",
    "brand/charts/Sparkline.tsx": "export function Sparkline() {}",
    "brand/charts/scales.ts": "export const yScale = 1;",
    "brand/previews/charts/Sparkline.tsx": "export default function SparklinePreview() {}",
    "brand/tests/screenshots/charts/Sparkline.screenshot.spec.ts": "",
    "pages/rounds/RoundsPage.tsx": "",
    "pages/rounds/useRoundsPageViewModel.ts": "",
    "pages/rounds/tests/RoundsPage.robot.ts": "",
    "pages/rounds/tests/RoundsPage.screenshot.spec.ts": "",
    "pages/rounds/tests/RoundsPage.espresso.spec.ts": "",
    "pages/rounds/tests/useRoundsPageViewModelTest.tsx": "",
    "pages/LegacyPage.tsx": "",
}


@pytest.fixture
def src(tmp_path: Path) -> Path:
    for name, body in COVERED.items():
        write(tmp_path, name, body)
    return tmp_path


def write(src: Path, name: str, body: str = "") -> None:
    path = src / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)


def test_a_covered_tree_passes(src):
    assert find_problems(src) == []


@pytest.mark.parametrize(
    "missing",
    [
        "brand/previews/components/Stat.tsx",
        "brand/tests/screenshots/charts/Sparkline.screenshot.spec.ts",
        "pages/rounds/tests/RoundsPage.robot.ts",
        "pages/rounds/tests/RoundsPage.screenshot.spec.ts",
        "pages/rounds/tests/RoundsPage.espresso.spec.ts",
        "pages/rounds/tests/useRoundsPageViewModelTest.tsx",
    ],
)
def test_flags_missing_coverage(src, missing):
    (src / missing).unlink()
    problems = find_problems(src)
    assert len(problems) == 1
    assert missing.rsplit("/", 1)[-1].split(".")[0] in problems[0]


def test_view_model_test_may_live_anywhere_in_its_page_folder(src):
    write(src, "pages/rounds/round-details/components/useRoundEditorViewModel.ts")
    write(src, "pages/rounds/round-details/tests/useRoundEditorViewModel.test.ts")
    assert find_problems(src) == []


def test_a_test_for_another_hook_does_not_count(src):
    write(src, "pages/rounds/useLinkCourseViewModel.ts")
    write(src, "pages/rounds/tests/useLinkCourseViewModelHelpersTest.tsx")
    assert len(find_problems(src)) == 1


def test_flags_a_spec_that_is_neither_look_nor_behaviour(src):
    write(src, "pages/rounds/tests/RoundsPage.spec.ts")
    [problem] = find_problems(src)
    assert "RoundsPage.spec.ts" in problem


def test_snapshot_folders_are_not_specs(src):
    (src / "pages/rounds/tests/RoundsPage.screenshot.spec.ts-snapshots").mkdir()
    assert find_problems(src) == []


def test_flags_a_second_file_exporting_the_same_component(src):
    write(src, "brand/charts/StatTile.tsx", "export function Stat() {}")
    write(src, "brand/previews/charts/StatTile.tsx")
    write(src, "brand/tests/screenshots/charts/StatTile.screenshot.spec.ts")
    [problem] = find_problems(src)
    assert "`Stat`" in problem


def test_reexports_and_types_are_not_duplicates(src):
    write(src, "brand/index.ts", 'export { Stat, StatLabel } from "./components/Stat";')
    write(src, "brand/components/variants/statVariants.ts", "export type { Stat };\nexport const STAT = 1;")
    assert find_problems(src) == []
