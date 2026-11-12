import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useShareRound } from "@/platform/useShareRound";
import { roundShareMessage } from "@/domain/share";
import { courseLabel, formatTeeName, teeRatingLabel } from "@/domain/course";
import { formatWeekday } from "@/domain/date";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CourseLinkSearch,
  Input,
  LoadingState,
  PageTitle,
  RoundFlowChart,
  RoundFlowFigures,
  RoundScorecard,
  RoundShareCard,
  TeePicker,
} from "@/brand";
import { LinkCoursePanel } from "../components/LinkCoursePanel";
import { RoundComparisonSection } from "./components/RoundComparisonSection";
import { RoundSummaryCard } from "./components/RoundSummaryCard";
import { RoundActions } from "./RoundActions";
import { useRoundDetailPageViewModel } from "./useRoundDetailPageViewModel";

export function RoundDetailPage({ userId }: { userId: string }) {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const viewModel = useRoundDetailPageViewModel(userId, roundId);
  const { cardRef: shareCardRef, share: shareRound, sharing } = useShareRound();

  if (viewModel.loading) {
    return <LoadingState>Loading round...</LoadingState>;
  }
  if (viewModel.loadError || !viewModel.played) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Could not load this round."}</AlertDescription>
      </Alert>
    );
  }

  const played = viewModel.played;
  const editor = viewModel.editor;
  const dateLine =
    [formatWeekday(viewModel.date), viewModel.tee ? formatTeeName(viewModel.tee) : null, teeRatingLabel(viewModel.rating)]
      .filter(Boolean)
      .join(" · ") || null;

  return (
    <div className="flex flex-col gap-3.5 pb-6 md:gap-4">
      {/* Rendered just off the right edge, so the share button can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={shareCardRef} round={played} />
      </div>

      <RoundActions
        editMode={editor.editing}
        saving={editor.saving}
        confirmDelete={viewModel.confirmDelete}
        deleting={viewModel.deleting}
        sharing={sharing}
        deleteLine={viewModel.deleteLine}
        canLink={viewModel.canLink}
        onEdit={viewModel.enterEditMode}
        onSave={editor.save}
        onCancelEdit={editor.cancel}
        onShare={() => void shareRound(roundShareMessage(played))}
        onLink={viewModel.openLinkCourse}
        onDelete={viewModel.requestDelete}
        onConfirmDelete={() => viewModel.confirmDeleteRound(() => void navigate("/rounds"))}
        onCancelDelete={viewModel.cancelDelete}
        onBack={() => void navigate(-1)}
      />

      {viewModel.actionError && (
        <Alert variant="destructive">
          <AlertDescription>{viewModel.actionError}</AlertDescription>
        </Alert>
      )}

      <div data-slot="round-title">
        {dateLine && <div className="text-body text-muted-foreground">{dateLine}</div>}
        <PageTitle size="heading" className="mt-0.5">
          {courseLabel(played.course?.name)}
        </PageTitle>
      </div>

      {viewModel.showLinkCourse && (
        <div className="max-w-130">
          <LinkCoursePanel
            userId={userId}
            roundId={played.id}
            title="Link to a course"
            onClose={viewModel.closeLinkCourse}
            onLinked={viewModel.closeLinkCourse}
          />
        </div>
      )}

      {editor.editing && (
        <div className="flex flex-col gap-3">
          <div className="max-w-130">
            <CourseLinkSearch
              query={editor.courseQuery}
              results={editor.courseResults}
              searching={editor.courseSearching}
              onQueryChange={editor.searchCourses}
              onSelectCourse={(c) => {
                void editor.pickCourse(c);
              }}
              onClose={editor.closeCourseSearch}
              reviewVariant
              onUseCustomName={editor.setCustomName}
              linkedName={editor.linkedName}
              customName={editor.customName}
              onClear={editor.changeCourse}
              clearLabel="Change course"
              focusOnOpen
            />
            {editor.playedNameToKeep && (
              <Button variant="linkMuted" size="inline" className="mt-1.5" onClick={editor.keepPlayedName}>
                Keep "{editor.playedNameToKeep}" without linking
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
          {viewModel.teeOptions.length > 0 ? (
            <TeePicker tees={viewModel.teeOptions} value={editor.teeBox} onChange={editor.setTeeBox} />
          ) : (
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-body font-semibold text-foreground-secondary">
                Tee
              </span>
              <Input
                aria-label="Tee"
                autoComplete="off"
                placeholder="e.g. White"
                value={editor.teeBox}
                onChange={(e) => editor.setTeeBox(e.target.value)}
                className="w-28"
              />
            </div>
          )}
        </div>
      )}

      <RoundSummaryCard round={played} />

      <RoundScorecard
        round={played}
        teeBox={editor.activeTeeBox}
        edits={
          editor.editing
            ? {
                onStrokesChange: (hole, strokes) => editor.setScore(hole, "strokes", strokes),
                onPuttsChange: (hole, putts) => editor.setScore(hole, "putts", putts),
                onGirChange: editor.setGir,
              }
            : undefined
        }
      />

      {!editor.editing && (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-round-detail md:gap-4">
          {viewModel.showFlow && (
            <Card data-slot="round-flow" size="lg">
              <CardHeader>
                <CardTitle level={2} className="text-body-lg font-semibold">
                  Round flow
                </CardTitle>
                <CardAction>
                  <RoundFlowFigures round={played} />
                </CardAction>
              </CardHeader>
              <CardContent>
                <RoundFlowChart round={played} />
              </CardContent>
            </Card>
          )}
          <RoundComparisonSection userId={userId} roundId={played.id} />
        </div>
      )}
    </div>
  );
}
