import { BestRoundHighlight } from "@/brand/components/BestRoundHighlight";
import { toParLabel } from "@/brand/theme";
import { formatRoundDateShort } from "@/lib/roundDate";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { roundFromSummary } from "@/testing/fixtures/roundDetails";

const best = populatedRounds[2];
const round = {
  id: best.id,
  courseName: best.course_name ?? "Unknown course",
  dateLabel: formatRoundDateShort(best.date) ?? "—",
  toParLabel: toParLabel(best.to_par) ?? "",
  totalScore: best.total_score,
};

export default function BestRoundHighlightPreview() {
  return (
    <>
      <BestRoundHighlight round={round} detail={roundFromSummary(best)} onClick={() => {}} />
      <BestRoundHighlight round={null} detail={null} />
    </>
  );
}
