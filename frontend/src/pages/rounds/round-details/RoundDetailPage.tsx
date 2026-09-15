import { useParams, useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { ShareCard } from "@/components/share/ShareCard";
import { useShareRound } from "@/hooks/useShareRound";
import {
  Alert,
  AlertDescription,
  Button,
  ComparisonChartCard,
  CourseLinkSearch,
  LoadingState,
  RoundDetailHeader,
  SectionLabel,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { ScrollSection } from "@/components/analytics/ScrollSection";
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
  if (viewModel.loadError || !viewModel.round) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Could not load this round."}</AlertDescription>
      </Alert>
    );
  }

  const round = viewModel.round;

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
        editMode={viewModel.editMode}
        saving={viewModel.saving}
        confirmDelete={viewModel.confirmDelete}
        deleting={viewModel.deleting}
        sharing={sharing}
        onEdit={viewModel.enterEditMode}
        onSave={() => { void viewModel.save(); }}
        onCancelEdit={viewModel.cancelEdit}
        onShare={() => shareRound(round, viewModel.courseName)}
        onDelete={viewModel.requestDelete}
        onConfirmDelete={() => {
          void viewModel.confirmDeleteRound().then((ok) => {
            if (ok) navigate("/rounds");
          });
        }}
        onCancelDelete={viewModel.cancelDelete}
        onBack={() => navigate(-1)}
      />

      <RoundDetailHeader
        courseName={viewModel.courseName}
        dateLabel={viewModel.dateLabel}
        tee={{ box: round.tee_box, rating: viewModel.teeRating }}
        score={{
          total: viewModel.totalScore,
          toPar: viewModel.toPar,
          net: viewModel.netScore,
          courseHandicap: viewModel.courseHandicap,
        }}
        nines={{ front: viewModel.frontNine, back: viewModel.backNine }}
        stats={{ putts: round.total_putts, gir: round.total_gir }}
        counts={viewModel.scoreCounts}
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
          <CourseLinkSearch
            title="Link to a saved course"
            query={viewModel.courseQuery}
            results={viewModel.courseResults}
            searching={viewModel.courseSearching}
            linking={viewModel.linking}
            onQueryChange={viewModel.handleCourseQuery}
            onSelectCourse={(c) => { void viewModel.handleSelectCourse(c); }}
            onClose={viewModel.closeLinkCourse}
          />
        </div>
      )}

      {viewModel.editMode && (
        <div className="mb-4">
          <CourseLinkSearch
            query={viewModel.courseQuery}
            results={viewModel.courseResults}
            searching={viewModel.courseSearching}
            onQueryChange={viewModel.handleCourseQuery}
            onSelectCourse={(c) => { void viewModel.handleSelectEditCourse(c); }}
            onClose={viewModel.closeEditCourseSearch}
            reviewVariant
            onUseCustomName={viewModel.useCustomName}
            linkedName={viewModel.editLinkedName}
            customName={viewModel.editCustomName}
            onClear={viewModel.startChangingCourse}
            clearLabel="Change course"
          />
          {viewModel.keepUnlinkedNameLabel && (
            <Button
              variant="linkMuted"
              size="xs"
              className="mt-1.5 h-auto p-0"
              onClick={viewModel.keepUnlinkedName}
            >
              {viewModel.keepUnlinkedNameLabel}
            </Button>
          )}
        </div>
      )}

      <div className={!viewModel.editMode ? "mt-2" : ""}>
        <ScorecardGrid
          round={round}
          editMode={viewModel.editMode}
          editedScores={viewModel.editedScores}
          editedTeeBox={viewModel.editedTeeBox}
          availableTees={viewModel.availableTees}
          onScoreChange={viewModel.handleScoreChange}
          onTeeBoxChange={viewModel.setEditedTeeBox}
          onGirChange={viewModel.handleGirChange}
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

      {viewModel.showComparison && (
        <div className="mt-8">
          <SectionLabel>Round Comparison</SectionLabel>
          <ScrollSection>
            <div className="md:hidden">
              <ToggleGroup
                variant="outline"
                spacing={2}
                value={[viewModel.chartTab]}
                onValueChange={(values) => viewModel.selectChartTab(values[0] ?? "")}
                className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none]"
              >
                {viewModel.chartTabs.map((tab) => (
                  <ToggleGroupItem key={tab.key} value={tab.key}>
                    {tab.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className={viewModel.packSelectedCharts ? "grid grid-cols-2 gap-3" : undefined}>
                {viewModel.selectedCharts.map((chart) => (
                  <ComparisonChartCard
                    key={chart.title}
                    title={chart.title}
                    bars={chart.bars}
                    primaryLabel={chart.primaryLabel}
                  />
                ))}
              </div>
            </div>
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-5">
              {viewModel.charts.map((chart) => (
                <ComparisonChartCard
                  key={chart.title}
                  title={chart.title}
                  bars={chart.bars}
                  primaryLabel={chart.primaryLabel}
                />
              ))}
            </div>
          </ScrollSection>
        </div>
      )}
    </div>
  );
}
