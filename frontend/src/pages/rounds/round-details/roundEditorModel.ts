import { chooseCompatibleTee, teeColors } from "@/domain/course";
import type { Course, Round } from "@/types/golf";
import type { UpdateRoundBody } from "../roundsRepository";

export type EditedScores = Record<number, { strokes: number | null; putts: number | null; gir?: boolean | null }>;

export type CourseEdit =
  | { status: "linked"; course: Course }
  | { status: "custom"; name: string }
  | { status: "picking" };

/** Edits exist only while editing, so a closed editor cannot hold stale scores. */
export type RoundEditor =
  | { editing: false }
  | { editing: true; scores: EditedScores; teeBox: string; course: CourseEdit };

export type OpenRoundEditor = Extract<RoundEditor, { editing: true }>;

export type RoundEditAction =
  | { type: "start"; round: Round }
  | { type: "stop" }
  | { type: "setScore"; hole: number; field: "strokes" | "putts"; value: number | null }
  | { type: "setGir"; hole: number; value: boolean | null }
  | { type: "setTeeBox"; teeBox: string }
  | { type: "linkCourse"; course: Course }
  | { type: "useCustomName"; name: string }
  | { type: "changeCourse" }
  | { type: "restoreCourse"; round: Round };

export const closedEditor: RoundEditor = { editing: false };

export function courseEditFromRound(round: Round): CourseEdit {
  if (round.course) return { status: "linked", course: round.course };
  if (round.course_name_played) return { status: "custom", name: round.course_name_played };
  return { status: "picking" };
}

function scoresFrom(round: Round): EditedScores {
  const scores: EditedScores = {};
  for (const s of round.hole_scores) {
    if (s.hole_number != null) scores[s.hole_number] = { strokes: s.strokes, putts: s.putts };
  }
  return scores;
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
      scores: scoresFrom(action.round),
      teeBox: action.round.tee_box ?? "",
      course: courseEditFromRound(action.round),
    };
  }
  if (action.type === "stop") return closedEditor;
  if (!state.editing) return state;

  switch (action.type) {
    case "setScore":
      return {
        ...state,
        scores: {
          ...state.scores,
          [action.hole]: { ...state.scores[action.hole], [action.field]: action.value },
        },
      };
    case "setGir":
      return {
        ...state,
        scores: { ...state.scores, [action.hole]: { ...state.scores[action.hole], gir: action.value } },
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

export interface SaveRoundRequest {
  /** Set when the golfer picked a different saved course, which is linked before the update. */
  linkCourseId: string | null;
  body: UpdateRoundBody;
}

export function saveRequestFrom(round: Round, editor: OpenRoundEditor): SaveRoundRequest {
  const { course } = editor;
  const linkCourseId =
    course.status === "linked" && course.course.id && course.course.id !== round.course?.id
      ? course.course.id
      : null;

  const holeScores = round.hole_scores
    .filter((s) => s.hole_number != null)
    .map((s) => {
      const edited = editor.scores[s.hole_number!];
      return {
        hole_number: s.hole_number!,
        strokes: edited?.strokes ?? s.strokes,
        putts: edited?.putts ?? s.putts,
        fairway_hit: s.fairway_hit,
        green_in_regulation: edited?.gir !== undefined ? edited.gir : s.green_in_regulation,
      };
    });

  // A custom name is written; picking a course clears one the round had.
  let courseNamePlayed: string | null | undefined;
  if (course.status === "custom") courseNamePlayed = course.name;
  else if (round.course_name_played) courseNamePlayed = null;

  return {
    linkCourseId,
    body: {
      hole_scores: holeScores,
      tee_box: editor.teeBox || null,
      ...(courseNamePlayed !== undefined ? { course_name_played: courseNamePlayed } : {}),
    },
  };
}
