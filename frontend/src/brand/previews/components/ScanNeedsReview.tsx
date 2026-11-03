import { ScanNeedsReview } from "@/brand/components/ScanNeedsReview";

const noop = () => {};

export default function ScanNeedsReviewPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Needs a look</div>
        <ScanNeedsReview holes={[4, 11, 16]} onReview={noop} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">One hole</div>
        <ScanNeedsReview holes={[7]} onReview={noop} />
      </div>
    </div>
  );
}
