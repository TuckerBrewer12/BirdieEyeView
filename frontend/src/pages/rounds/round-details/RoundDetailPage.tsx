import { type ReactNode, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { ShareCard } from "@/components/share/ShareCard";
import { useShareRound } from "@/hooks/useShareRound";
import {
  Alert,
  AlertDescription,
  Button,
  chartColors,
  chartTooltipStyle,
  colors,
  CourseLinkSearch,
  LoadingState,
  RoundDetailHeader,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import type { ComparisonRow } from "@/types/analytics";
import { ScorecardGrid } from "@/components/round-detail/ScorecardGrid";
import { RoundFlowTimeline } from "@/components/analytics/RoundFlowTimeline";
import { RoundActions } from "./RoundActions";
import { useRoundDetailPageViewModel } from "./useRoundDetailPageViewModel";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px w-8 bg-primary/30 rounded-full" />
      <span className="text-[11px] font-bold text-primary/50 uppercase tracking-[0.18em]">
        {children}
      </span>
    </div>
  );
}

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

function formatNumber(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function ComparisonChartCard({
  title,
  rows,
  primaryLabel,
}: {
  title: string;
  rows: ComparisonRow[];
  primaryLabel: string;
}) {
  const chartData = rows.map((row, i) => ({
    label: row.label,
    value: row.primary_value ?? 0,
    sampleSize: row.sample_size,
    isSelected: i === 0,
  }));
  // Mobile and desktop both mount these cards, so a shared gradient id
  // would resolve to the hidden copy and the selected bar would not paint.
  const selectedFill = `selectedBarGrad${useId().replace(/:/g, "")}`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className="text-sm font-bold text-card-foreground mb-1">{title}</div>
      <div className="text-xs text-muted-foreground mb-3">
        <span className="font-bold text-primary">{formatNumber(rows[0]?.primary_value ?? null)}</span>
        {" "}{primaryLabel} this round
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={selectedFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={((v: number, _name: string, props: { payload: { sampleSize: number } }) => [
              formatNumber(v),
              `${primaryLabel} (${props.payload.sampleSize} round${props.payload.sampleSize === 1 ? "" : "s"})`,
            ]) as Fmt}
            contentStyle={chartTooltipStyle}
          />
          {/* Recharts grows bars with CSS; Playwright's screenshot pass freezes that at height 0. */}
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {chartData.map((d) => (
              <Cell key={d.label} fill={d.isSelected ? `url(#${selectedFill})` : chartColors.muted} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }}>
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
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 overflow-x-auto">
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
                onValueChange={(values) => {
                  const next = values[0];
                  if (next) viewModel.selectChartTab(next);
                }}
                className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none]"
              >
                {viewModel.chartTabs.map((tab) => (
                  <ToggleGroupItem key={tab.key} value={tab.key}>
                    {tab.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className={viewModel.selectedCharts.length > 1 ? "grid grid-cols-2 gap-3" : undefined}>
                {viewModel.selectedCharts.map((chart) => (
                  <ComparisonChartCard
                    key={chart.title}
                    title={chart.title}
                    rows={chart.rows}
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
                  rows={chart.rows}
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
