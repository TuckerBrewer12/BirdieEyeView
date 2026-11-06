import { labAnalytics } from "@/testing/fixtures/lab";
import { PuttingCard } from "../components/PuttingCard";
import { puttingSummaryFrom } from "../model";

export default function PuttingCardPreview() {
  return (
    <>
      <PuttingCard putting={puttingSummaryFrom(labAnalytics)} />
      <PuttingCard
        putting={{ threePuttsPerRound: null, threePuttRate: null, puttsPerRound: null, puttsTrend: [] }}
      />
    </>
  );
}
