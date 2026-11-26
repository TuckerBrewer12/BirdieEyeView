import { ScanProcessingStep } from "../components/ScanProcessingStep";

const noop = () => {};

export default function ScanProcessingStepPreview() {
  return (
    <div className="flex flex-col gap-8">
      <ScanProcessingStep photoUrl="/hero/physical-card.jpg" phase={1} slow={false} onCancel={noop} />
      <ScanProcessingStep photoUrl="/hero/physical-card.jpg" phase={3} slow onCancel={noop} />
    </div>
  );
}
