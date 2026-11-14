import { useNavigate } from "react-router-dom";
import {
  LoadingState,
  PageHeader,
  PageTitle,
  ToggleGroup,
  ToggleGroupItem,
  useFromBreakpoint,
} from "@/brand";
import { isNative, pickImageNative } from "@/platform/nativeCamera";
import { useFilePreview } from "@/platform/useFilePreview";
import { ScanPhotoStepPhone, ScanPhotoStepWide } from "./components/ScanPhotoStep";
import { ScanProcessingStep } from "./components/ScanProcessingStep";
import { ScanReviewStep } from "./components/ScanReviewStep";
import { ScanSetupStep } from "./components/ScanSetupStep";
import { ScanSuccessStep } from "./components/ScanSuccessStep";
import { useScanPageViewModel } from "./useScanPageViewModel";

const TITLE = "Scan";

export function ScanPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const viewModel = useScanPageViewModel(userId);
  const previewUrl = useFilePreview(viewModel.photo);
  const wide = useFromBreakpoint("md");

  switch (viewModel.step) {
    case "success":
      return (
        <div className="flex flex-col pb-6">
          <PageHeader title="Round saved" revealAt={100} />
          {viewModel.savedRound ? (
            <ScanSuccessStep
              round={viewModel.savedRound}
              onView={() => viewModel.openSavedRound((roundId) => void navigate(`/rounds/${roundId}`))}
              onScanAnother={viewModel.scanAnother}
            />
          ) : (
            <LoadingState>Loading…</LoadingState>
          )}
        </div>
      );

    case "review": {
      const manual = viewModel.mode === "manual";
      const title = manual ? "Enter your scores" : "Check your card";
      return (
        <div className="flex flex-col pb-6">
          <PageHeader title={title} revealAt={100} />
          <ScanReviewStep
            review={viewModel.review}
            title={title}
            manual={manual}
            photoUrl={previewUrl}
            onStartOver={viewModel.startOver}
          />
        </div>
      );
    }

    case "processing":
      return (
        <div className="flex flex-col gap-2.5 pb-6">
          <PageHeader title={TITLE} revealAt={100} />
          <PageTitle>{TITLE}</PageTitle>
          <ScanProcessingStep photoUrl={previewUrl} phase={viewModel.phase} />
        </div>
      );

    default:
      return (
        <div className="flex max-w-4xl flex-col gap-4 pb-6 md:gap-5">
          <PageHeader title={TITLE} revealAt={100} />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <PageTitle>{TITLE}</PageTitle>
            <ToggleGroup
              look="boxed"
              fill
              aria-label="Entry method"
              className="md:w-fit"
              value={[viewModel.mode]}
              onValueChange={(values) => {
                if (values[0] === "scan" || values[0] === "manual") viewModel.setMode(values[0]);
              }}
            >
              <ToggleGroupItem value="scan">Photo</ToggleGroupItem>
              <ToggleGroupItem value="manual">By hand</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {viewModel.step === "setup" ? (
            <ScanSetupStep setup={viewModel.setup} />
          ) : wide ? (
            <ScanPhotoStepWide step={viewModel} previewUrl={previewUrl} />
          ) : (
            <ScanPhotoStepPhone
              step={viewModel}
              previewUrl={previewUrl}
              pickNative={isNative ? pickImageNative : undefined}
            />
          )}
        </div>
      );
  }
}
