import { withoutRounds } from "@/testing/fakes/analyticsResponses";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { AnalyticsKpis } from "../components/AnalyticsKpis";
import { analyticsFrom } from "../model";
import { headlineFigures } from "../present";

export default function AnalyticsKpisPreview() {
  return (
    <>
      <AnalyticsKpis kpis={headlineFigures(analyticsFrom(sampleGolfer.analytics))} />
      <AnalyticsKpis kpis={headlineFigures(analyticsFrom(withoutRounds(sampleGolfer.analytics)))} />
    </>
  );
}
