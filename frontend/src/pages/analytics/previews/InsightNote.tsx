import { InsightNote } from "../components/InsightNote";
import { narrativeFor } from "../present";

// One of each tone: scores coming down (good), putts climbing (bad), and a flat average.
export default function InsightNotePreview() {
  return (
    <div className="flex max-w-md flex-col gap-3">
      <InsightNote narrative={narrativeFor({ kind: "scoring-shift", strokes: 2.1, rounds: 24 })} />
      <InsightNote narrative={narrativeFor({ kind: "putts-shift", putts: -1.2 })} />
      <InsightNote narrative={narrativeFor({ kind: "gir-average", percent: 38.5 })} />
    </div>
  );
}
