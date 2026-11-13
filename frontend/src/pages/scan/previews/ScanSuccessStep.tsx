import { Round } from "@/domain";
import { halfMoonBayRound, scannedRound } from "@/testing/fixtures/roundDetails";
import { ScanSuccessStep } from "../components/ScanSuccessStep";

const noop = () => {};

/** Two saved rounds, each with its score against par. */
export default function ScanSuccessStepPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ScanSuccessStep round={Round.fromDto(halfMoonBayRound)} onView={noop} onScanAnother={noop} />
      <ScanSuccessStep round={Round.fromDto(scannedRound)} onView={noop} onScanAnother={noop} />
    </div>
  );
}
