import { describe, it, expect } from "vitest";
import { Round, type RoundDetail } from "@/domain";
import {
  halfMoonBayCourse,
  halfMoonBayRound as halfMoonBayDto,
  pebbleBeachCourse,
  scannedRound as scannedDto,
} from "@/testing/fixtures/roundDetails";
import {
  closedEditor,
  editorChanged,
  roundEditor,
  type OpenRoundEditor,
  type RoundEditAction,
} from "../roundEditorModel";

const halfMoonBayRound = Round.detailFromDto(halfMoonBayDto);
const scannedRound = Round.detailFromDto(scannedDto);

function edit(round: RoundDetail, ...actions: RoundEditAction[]): OpenRoundEditor {
  const state = [{ type: "start", round } as RoundEditAction, ...actions].reduce(roundEditor, closedEditor);
  if (!state.editing) throw new Error("expected an open editor");
  return state;
}

const hole1 = halfMoonBayRound.holes.find((hole) => hole.hole === 1)!;

describe("roundEditor", () => {
  it("starts from the round's own scores, tee and course", () => {
    const editor = edit(halfMoonBayRound);
    expect(editor.holes[1]).toEqual({ strokes: hole1.strokes, putts: hole1.putts });
    expect(editor.teeBox).toBe(halfMoonBayRound.teeBox ?? "");
    expect(editor.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("starts an unlinked round on its played name", () => {
    expect(edit(scannedRound).course).toEqual({ status: "custom", name: "Scanned Scorecard" });
  });

  it("changes one hole's strokes and keeps its putts", () => {
    const editor = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: 3 });
    expect(editor.holes[1]).toEqual({ strokes: 3, putts: hole1.putts });
    expect(editor.holes[2]).toEqual(edit(halfMoonBayRound).holes[2]);
  });

  it("ignores edits while closed", () => {
    expect(roundEditor(closedEditor, { type: "setTeeBox", teeBox: "Blue" })).toBe(closedEditor);
  });

  it("stopping drops every edit", () => {
    const editor = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: 3 });
    expect(roundEditor(editor, { type: "stop" })).toEqual({ editing: false });
  });

  it("linking a course keeps a tee it also has", () => {
    const editor = edit(halfMoonBayRound, { type: "setTeeBox", teeBox: "White" }, { type: "linkCourse", course: halfMoonBayCourse });
    expect(editor.teeBox).toBe("White");
  });

  it("linking a course with one tee takes that tee", () => {
    const editor = edit(scannedRound, { type: "setTeeBox", teeBox: "" }, { type: "linkCourse", course: pebbleBeachCourse });
    expect(editor.teeBox).toBe("Blue");
  });

  it("linking a course with no tees leaves the tee alone", () => {
    const teeless = { ...pebbleBeachCourse, tees: [] };
    const editor = edit(scannedRound, { type: "setTeeBox", teeBox: "Red" }, { type: "linkCourse", course: teeless });
    expect(editor.teeBox).toBe("Red");
  });

  it("restoring the course undoes a pick", () => {
    const editor = edit(
      halfMoonBayRound,
      { type: "linkCourse", course: pebbleBeachCourse },
      { type: "restoreCourse", round: halfMoonBayRound },
    );
    expect(editor.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });
});

describe("editorChanged", () => {
  it("is false while closed, and when nothing has been changed yet", () => {
    expect(editorChanged(closedEditor, halfMoonBayRound)).toBe(false);
    expect(editorChanged(edit(halfMoonBayRound), halfMoonBayRound)).toBe(false);
    expect(editorChanged(edit(scannedRound), scannedRound)).toBe(false);
  });

  it("is true once a hole's strokes, putts or green change", () => {
    const strokes = { type: "setScore", hole: 1, field: "strokes", value: (hole1.strokes ?? 0) + 1 } as const;
    const putts = { type: "setScore", hole: 1, field: "putts", value: (hole1.putts ?? 0) + 1 } as const;
    const green = { type: "setGir", hole: 1, value: !hole1.gir } as const;
    expect(editorChanged(edit(halfMoonBayRound, strokes), halfMoonBayRound)).toBe(true);
    expect(editorChanged(edit(halfMoonBayRound, putts), halfMoonBayRound)).toBe(true);
    expect(editorChanged(edit(halfMoonBayRound, green), halfMoonBayRound)).toBe(true);
  });

  it("is true once a hole is cleared", () => {
    const cleared = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: null });
    expect(editorChanged(cleared, halfMoonBayRound)).toBe(true);
  });

  it("is false again when a score is typed back to what was saved", () => {
    const editor = edit(
      halfMoonBayRound,
      { type: "setScore", hole: 1, field: "strokes", value: (hole1.strokes ?? 0) + 1 },
      { type: "setScore", hole: 1, field: "strokes", value: hole1.strokes },
    );
    expect(editorChanged(editor, halfMoonBayRound)).toBe(false);
  });

  it("is true once the tee changes", () => {
    expect(editorChanged(edit(halfMoonBayRound, { type: "setTeeBox", teeBox: "White" }), halfMoonBayRound)).toBe(true);
  });

  it("is true once the course changes, is cleared, or the played name is renamed", () => {
    expect(editorChanged(edit(halfMoonBayRound, { type: "linkCourse", course: pebbleBeachCourse }), halfMoonBayRound)).toBe(true);
    expect(editorChanged(edit(halfMoonBayRound, { type: "changeCourse" }), halfMoonBayRound)).toBe(true);
    expect(editorChanged(edit(scannedRound, { type: "useCustomName", name: "Torrey Pines" }), scannedRound)).toBe(true);
  });

  it("is false when the same course is picked again or the search is closed", () => {
    expect(editorChanged(edit(halfMoonBayRound, { type: "linkCourse", course: halfMoonBayCourse }), halfMoonBayRound)).toBe(false);
    const reopened = edit(halfMoonBayRound, { type: "changeCourse" }, { type: "restoreCourse", round: halfMoonBayRound });
    expect(editorChanged(reopened, halfMoonBayRound)).toBe(false);
  });
});
