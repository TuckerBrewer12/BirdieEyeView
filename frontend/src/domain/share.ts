import { formatCourseName } from "./course";
import type { Round } from "./round";
import { toParLabel } from "./score";

export interface ShareMessage {
  title: string;
  text: string;
  fileName: string;
}

export function roundShareMessage(round: Round): ShareMessage {
  const course = formatCourseName(round.course?.name);
  const score = round.score ?? "—";
  const toPar = toParLabel(round.toPar);
  return {
    title: `${score} at ${course}`,
    text: `Check out my ${score}${toPar ? ` (${toPar})` : ""} at ${course}! ⛳`,
    fileName: `scorecard-${course.replace(/\s+/g, "-").toLowerCase()}.png`,
  };
}
