import { labAnalytics } from "@/testing/fixtures/lab";
import { PeakGameCard } from "../components/PeakGameCard";
import { peakGameFrom, peakImpactsFrom, peakVsAverageFrom } from "../model";

export default function PeakGameCardPreview() {
  const peak = peakGameFrom(labAnalytics, 89)!;
  const impacts = peakImpactsFrom(peakVsAverageFrom(labAnalytics, peak)!);
  return (
    <>
      <PeakGameCard peak={peak} impacts={impacts} goalLabel="Break 90" />
      {/* The best rounds already meet a looser goal; no score types to compare. */}
      <PeakGameCard peak={peakGameFrom(labAnalytics, 94)!} impacts={[]} goalLabel="Break 95" />
    </>
  );
}
