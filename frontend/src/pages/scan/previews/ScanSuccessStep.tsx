import { Round } from "@/domain";
import { halfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";
import { ScanSuccessStep } from "../components/ScanSuccessStep";

const noop = () => {};

export default function ScanSuccessStepPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ScanSuccessStep round={Round.fromDto(halfMoonBayRound)} onView={noop} />
      <ScanSuccessStep round={Round.fromDto(scannedRound)} onView={noop} />
    </div>
  );
}
