import { chooseCompatibleTee, teeColors } from "@/domain/course";
import type { CourseEdit, HoleEdits, RoundDetail, RoundEdits } from "@/domain";
import type { Course } from "@/types/golf";

/** Edits exist only while editing, so a closed editor cannot hold stale scores. */
export type RoundEditor = { editing: false } | ({ editing: true } & RoundEdits);

export type OpenRoundEditor = Extract<RoundEditor, { editing: true }>;

export type RoundEditAction =
  | { type: "start"; round: RoundDetail }
  | { type: "stop" }
  | { type: "setScore"; hole: number; field: "strokes" | "putts"; value: number | null }
  | { type: "setGir"; hole: number; value: boolean | null }
  | { type: "setTeeBox"; teeBox: string }
  | { type: "linkCourse"; course: Course }
  | { type: "useCustomName"; name: string }
  | { type: "changeCourse" }
  | { type: "restoreCourse"; round: RoundDetail };

export const closedEditor: RoundEditor = { editing: false };

export function courseEditFromRound(round: RoundDetail): CourseEdit {
  if (round.linkedCourse) return { status: "linked", course: round.linkedCourse };
  if (round.playedName) return { status: "custom", name: round.playedName };
  return { status: "picking" };
}

function holesFrom(round: RoundDetail): HoleEdits {
  const holes: HoleEdits = {};
  for (const hole of round.holes) holes[hole.hole] = { strokes: hole.strokes, putts: hole.putts };
  return holes;
}

/** Keep the tee if the new course has a matching one, take its only tee, or leave it for the golfer to pick. */
function teeOnCourse(current: string, course: Course): string {
  const tees = teeColors(course);
  if (tees.length === 0) return current;
  if (current.trim()) {
    const matched = chooseCompatibleTee(current, tees);
    if (matched) return matched;
  }
  return tees.length === 1 ? tees[0] : "";
}

export function roundEditor(state: RoundEditor, action: RoundEditAction): RoundEditor {
  if (action.type === "start") {
    return {
      editing: true,
      holes: holesFrom(action.round),
      teeBox: action.round.teeBox ?? "",
      course: courseEditFromRound(action.round),
    };
  }
  if (action.type === "stop") return closedEditor;
  if (!state.editing) return state;

  switch (action.type) {
    case "setScore":
      return {
        ...state,
        holes: {
          ...state.holes,
          [action.hole]: { ...state.holes[action.hole], [action.field]: action.value },
        },
      };
    case "setGir":
      return {
        ...state,
        holes: { ...state.holes, [action.hole]: { ...state.holes[action.hole], gir: action.value } },
      };
    case "setTeeBox":
      return { ...state, teeBox: action.teeBox };
    case "linkCourse":
      return {
        ...state,
        course: { status: "linked", course: action.course },
        teeBox: teeOnCourse(state.teeBox, action.course),
      };
    case "useCustomName":
      return { ...state, course: { status: "custom", name: action.name } };
    case "changeCourse":
      return { ...state, course: { status: "picking" } };
    case "restoreCourse":
      return { ...state, course: courseEditFromRound(action.round) };
  }
}
