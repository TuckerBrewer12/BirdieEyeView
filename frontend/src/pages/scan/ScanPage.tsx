import { useNavigate } from "react-router-dom";
import { PenLine, ScanLine } from "lucide-react";
import {
  Alert,
  AlertDescription,
  CourseLinkSearch,
  LoadingState,
  PageHeader,
  PageTitle,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { formatCourseName } from "@/domain/course";
import { useFilePreview } from "@/platform/useFilePreview";
import { ScanProcessingStep } from "./components/ScanProcessingStep";
import { ScanReviewStep } from "./components/ScanReviewStep";
import { ScanSetupStep } from "./components/ScanSetupStep";
import { ScanSuccessStep } from "./components/ScanSuccessStep";
import { ScanUploadStep } from "./components/ScanUploadStep";
import { useScanPageViewModel } from "./useScanPageViewModel";

const TITLE = "Scan Scorecard";

export function ScanPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const viewModel = useScanPageViewModel(userId);
  const previewUrl = useFilePreview(viewModel.photo);

  switch (viewModel.step) {
    case "success":
      return (
        <div className="flex flex-col pb-6">
          <PageHeader title={TITLE} revealAt={100} />
          {viewModel.savedRound ? (
            <ScanSuccessStep
              round={viewModel.savedRound}
              onView={() => viewModel.openSavedRound((roundId) => navigate(`/rounds/${roundId}`))}
            />
          ) : (
            <LoadingState>Loading…</LoadingState>
          )}
        </div>
      );

    case "review":
      return (
        <div className="flex flex-col gap-4 pb-6">
          <PageHeader title={TITLE} revealAt={100} />
          <div className="flex flex-col gap-1">
            <PageTitle>{viewModel.mode === "manual" ? "Enter your scores" : "Check your card"}</PageTitle>
            <p className="text-sm text-muted-foreground">
              {viewModel.mode === "manual"
                ? "Type your scores in hole by hole, then save the round."
                : "Check each score against your card, fix any that are wrong, then save the round."}
            </p>
          </div>
          <ScanReviewStep
            review={viewModel.review}
            manual={viewModel.mode === "manual"}
            photoUrl={previewUrl}
            onStartOver={viewModel.startOver}
          />
        </div>
      );

    case "processing":
      return (
        <div className="flex flex-col gap-2.5 pb-6">
          <PageHeader title={TITLE} revealAt={100} />
          <PageTitle>{TITLE}</PageTitle>
          <ScanProcessingStep phase={viewModel.phase} />
        </div>
      );

    default:
      return (
        <div className="flex flex-col gap-4 pb-6">
          <PageHeader title={TITLE} revealAt={100} />
          <div className="flex flex-col gap-1">
            <PageTitle>{TITLE}</PageTitle>
            <p className="text-sm text-muted-foreground">
              Read a photo of your card, or type the scores in yourself.
            </p>
          </div>

          <ToggleGroup
            aria-label="How to add the round"
            value={[viewModel.mode]}
            onValueChange={(values) => {
              // Pressing the chosen mode again would clear it; one is always chosen.
              if (values[0] === "scan" || values[0] === "manual") viewModel.setMode(values[0]);
            }}
          >
            <ToggleGroupItem value="scan">
              <ScanLine data-icon="inline-start" />
              Scan a card
            </ToggleGroupItem>
            <ToggleGroupItem value="manual">
              <PenLine data-icon="inline-start" />
              Enter by hand
            </ToggleGroupItem>
          </ToggleGroup>

          {viewModel.error && (
            <Alert variant="destructive">
              <AlertDescription>{viewModel.error}</AlertDescription>
            </Alert>
          )}

          {viewModel.step === "setup" ? (
            <ScanSetupStep setup={viewModel.setup} />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Optional: pick the course first and the scan reads the card against it.
                </p>
                <CourseLinkSearch
                  query={viewModel.courseSearch.query}
                  results={viewModel.courseSearch.results}
                  searching={viewModel.courseSearch.searching}
                  onQueryChange={viewModel.courseSearch.setQuery}
                  onSelectCourse={viewModel.pickPresetCourse}
                  onClose={viewModel.courseSearch.reset}
                  autoFocus={false}
                  linkedName={viewModel.presetCourse ? formatCourseName(viewModel.presetCourse.name) : undefined}
                  onClear={viewModel.clearPresetCourse}
                  clearLabel="Clear course"
                />
              </div>
              <ScanUploadStep
                photo={
                  viewModel.photo
                    ? { name: viewModel.photo.name, sizeBytes: viewModel.photo.size, previewUrl }
                    : null
                }
                onPick={viewModel.pickPhoto}
                onClear={viewModel.clearPhoto}
                onContextChange={viewModel.setUserContext}
                onExtract={viewModel.extract}
              />
            </>
          )}
        </div>
      );
  }
}
