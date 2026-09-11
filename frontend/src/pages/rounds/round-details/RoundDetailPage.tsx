import { useMemo, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { ShareCard } from "@/components/share/ShareCard";
import { useShareRound } from "@/hooks/useShareRound";
import {
  Alert,
  AlertDescription,
  CourseLinkSearch,
  LoadingState,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette, type ChartPalette } from "@/lib/chartPalettes";
import type { ComparisonRow } from "@/types/analytics";
import { ScorecardGrid } from "@/components/round-detail/ScorecardGrid";
import { RoundDetailHeader } from "@/components/round-detail/RoundDetailHeader";
import { RoundFlowTimeline } from "@/components/analytics/RoundFlowTimeline";
import { useRoundDetailPageViewModel } from "./useRoundDetailPageViewModel";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid #f1f5f9",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  background: "rgba(255,255,255,0.97)",
};

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
  palette,
}: {
  title: string;
  rows: ComparisonRow[];
  primaryLabel: string;
  palette?: ChartPalette | null;
}) {
  const chartData = rows.map((row, i) => ({
    label: row.label,
    value: row.primary_value ?? 0,
    sampleSize: row.sample_size,
    isSelected: i === 0,
  }));
  const selectedFill = palette ? (palette.trend.primary ?? "#2563EB") : "url(#selectedBarGrad)";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-gray-200/50">
      <div className="text-sm font-bold text-gray-900 mb-1">{title}</div>
      <div className="text-xs text-gray-400 mb-3">
        <span className="font-bold text-primary">{formatNumber(rows[0]?.primary_value ?? null)}</span>
        {" "}{primaryLabel} this round
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="selectedBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette?.trend.secondary ?? "#4ade80"} stopOpacity={1} />
              <stop offset="100%" stopColor={palette?.trend.primary ?? "#2d7a3a"} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={((v: number, _name: string, props: { payload: { sampleSize: number } }) => [
              formatNumber(v),
              `${primaryLabel} (${props.payload.sampleSize} round${props.payload.sampleSize === 1 ? "" : "s"})`,
            ]) as Fmt}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.label} fill={d.isSelected ? selectedFill : (palette?.ui.mutedFill ?? "#e5e7eb")} />
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
  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);
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

      <RoundDetailHeader
        round={round}
        courseName={viewModel.courseName}
        totalScore={viewModel.totalScore}
        toPar={viewModel.toPar}
        netScore={viewModel.netScore}
        courseHandicap={viewModel.courseHandicap}
        tee={viewModel.tee}
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

      {viewModel.showLinkButton && (
        <div className="mb-3 -mt-2">
          <button
            onClick={viewModel.openLinkCourse}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
          >
            <Link2 size={12} />
            Link course
          </button>
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
          {viewModel.showKeepUnlinkedName && viewModel.playedCourseName && (
            <button
              type="button"
              onClick={() => viewModel.useCustomName(viewModel.playedCourseName!)}
              className="mt-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
            >
              Keep "{viewModel.playedCourseName}" without linking →
            </button>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
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
                value={viewModel.chartTabs.filter((tab) => tab.active).map((tab) => tab.key)}
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
                    palette={colorBlindPalette}
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
                  palette={colorBlindPalette}
                />
              ))}
            </div>
          </ScrollSection>
        </div>
      )}
    </div>
  );
}
