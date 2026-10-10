import { useParams, useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { useShareRound } from "@/hooks/useShareRound";
import { roundShareMessage } from "@/lib/roundShareMessage";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CourseLinkSearch,
  Input,
  LoadingState,
  RoundFlowChart,
  RoundScorecard,
  RoundShareCard,
  SectionLabel,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { LinkCoursePanel } from "../components/LinkCoursePanel";
import { RoundComparisonSection } from "./components/RoundComparisonSection";
import { RoundDetailHeader } from "./components/RoundDetailHeader";
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

  return (
    <div>
      {/* Rendered just off the right edge, so the share button can capture it as an image. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={shareCardRef} round={played} />
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
        onShare={() => shareRound(roundShareMessage(played))}
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
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Tee</span>
            {editor.availableTees.length > 0 ? (
              <ToggleGroup
                variant="outline"
                size="sm"
                aria-label="Tee"
                value={editor.teeBox ? [editor.teeBox] : []}
                onValueChange={(values) => editor.setTeeBox(values[0] ?? "")}
              >
                {editor.availableTees.map((color) => (
                  <ToggleGroupItem key={color} value={color}>
                    {color}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : (
              <Input
                aria-label="Tee"
                autoComplete="off"
                placeholder="e.g. White"
                value={editor.teeBox}
                onChange={(e) => editor.setTeeBox(e.target.value)}
                className="w-28"
              />
            )}
          </div>
        </div>
      )}

      <div className={!editor.editing ? "mt-2" : ""}>
        <RoundScorecard
          round={played}
          teeBox={editor.editing ? editor.teeBox : played.teeBox}
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
      </div>

      {viewModel.showMomentum && (
        <div className="mt-6">
          <SectionLabel>Momentum</SectionLabel>
          <Card>
            <CardContent>
              <RoundFlowChart round={played} />
            </CardContent>
          </Card>
        </div>
      )}

      <RoundComparisonSection userId={userId} roundId={played.id} />
    </div>
  );
}
