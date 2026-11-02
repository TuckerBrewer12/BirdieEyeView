import { formatCourseName } from "./course";
import type { Round } from "./round";
import { toParLabel } from "./score";

/** What goes out with a shared image: the share sheet's title and text, or the download's name. */
export interface ShareMessage {
  title: string;
  text: string;
  fileName: string;
}

/** What a shared round says alongside its image: "Check out my 78 (+6) at Half Moon Bay!" */
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
