import { useParams, useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { ShareCard } from "@/components/share/ShareCard";
import { useShareRound } from "@/hooks/useShareRound";
import {
  Alert,
  AlertDescription,
  Button,
  CourseLinkSearch,
  LoadingState,
  SectionLabel,
} from "@/brand";
import { LinkCoursePanel } from "../components/LinkCoursePanel";
import { RoundComparisonSection } from "./components/RoundComparisonSection";
import { RoundDetailHeader } from "./components/RoundDetailHeader";
import { ScorecardGrid } from "@/components/round-detail/ScorecardGrid";
import { RoundFlowTimeline } from "@/components/analytics/RoundFlowTimeline";
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
  if (viewModel.loadError || !viewModel.round || !viewModel.played) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Could not load this round."}</AlertDescription>
      </Alert>
    );
  }

  const round = viewModel.round;
  const played = viewModel.played;
  const editor = viewModel.editor;

  return (
    <div>
      <div className="pointer-events-none fixed -left-[9999px] top-0">
        <ShareCard ref={shareCardRef} round={round} courseName={viewModel.courseName} />
      </div>

      {viewModel.actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{viewModel.actionError}</AlertDescription>
        </Alert>
      )}

      <RoundActions
        editMode={editor.editing}
        saving={editor.saving}
        confirmDelete={viewModel.confirmDelete}
        deleting={viewModel.deleting}
        sharing={sharing}
        onEdit={viewModel.enterEditMode}
        onSave={editor.save}
        onCancelEdit={editor.cancel}
        onShare={() => shareRound(round, viewModel.courseName)}
        onDelete={viewModel.requestDelete}
        onConfirmDelete={() => viewModel.confirmDeleteRound(() => navigate("/rounds"))}
        onCancelDelete={viewModel.cancelDelete}
        onBack={() => navigate(-1)}
      />

      <RoundDetailHeader
        round={played}
        teeRating={viewModel.teeRating}
        courseHandicap={viewModel.courseHandicap}
      />

      {viewModel.showLinkButton && (
        <div className="mb-3 -mt-2">
          <Button
            variant="linkMuted"
            size="xs"
            className="h-auto p-0"
            onClick={viewModel.openLinkCourse}
          >
            <Link2 />
            Link course
          </Button>
        </div>
      )}
      {viewModel.showLinkCourse && (
        <div className="mb-4">
          <LinkCoursePanel
            userId={userId}
            roundId={played.id}
            title="Link to a saved course"
            onClose={viewModel.closeLinkCourse}
            onLinked={viewModel.closeLinkCourse}
          />
        </div>
      )}

      {editor.editing && (
        <div className="mb-4">
          <CourseLinkSearch
            query={editor.courseQuery}
            results={editor.courseResults}
            searching={editor.courseSearching}
            onQueryChange={editor.searchCourses}
            onSelectCourse={(c) => { void editor.pickCourse(c); }}
            onClose={editor.closeCourseSearch}
            reviewVariant
            onUseCustomName={editor.setCustomName}
            linkedName={editor.linkedName}
            customName={editor.customName}
            onClear={editor.changeCourse}
            clearLabel="Change course"
          />
          {editor.playedNameToKeep && (
            <Button
              variant="linkMuted"
              size="xs"
              className="mt-1.5 h-auto p-0"
              onClick={editor.keepPlayedName}
            >
              Keep "{editor.playedNameToKeep}" without linking →
            </Button>
          )}
        </div>
      )}

      <div className={!editor.editing ? "mt-2" : ""}>
        <ScorecardGrid
          round={round}
          editMode={editor.editing}
          editedScores={editor.scores}
          editedTeeBox={editor.teeBox}
          availableTees={editor.availableTees}
          onScoreChange={editor.setScore}
          onTeeBoxChange={editor.setTeeBox}
          onGirChange={editor.setGir}
        />
      </div>

      {viewModel.showMomentum && (
        <div className="mt-6">
          <SectionLabel>Momentum</SectionLabel>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="min-w-[720px]">
              <RoundFlowTimeline round={round} />
            </div>
          </div>
        </div>
      )}

      <RoundComparisonSection userId={userId} roundId={played.id} />
    </div>
  );
}
