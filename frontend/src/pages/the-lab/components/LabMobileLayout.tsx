import { Card, CardContent, CardHeader, CardTitle, PageTitle, SectionLabel, ToggleGroup, ToggleGroupItem } from "@/brand";
import type { LabPanel } from "../model";
import type { LabPageViewModel } from "../useLabPageViewModel";
import { LAB_PANEL_LABEL, benchmarkName, goalLabel } from "../present";
import { AttemptsCard } from "./AttemptsCard";
import { GoalPicker } from "./GoalPicker";
import { GoalStandingCard } from "./GoalStandingCard";
import { ParTypeCard } from "./ParTypeCard";
import { PeakGameCard } from "./PeakGameCard";
import { PerformanceShapeCard } from "./PerformanceShapeCard";
import { PuttingCard } from "./PuttingCard";
import { SaverCard } from "./SaverCard";

/** The attempts chart needs a few rounds to say anything. */
const MIN_ATTEMPTS = 3;

/**
 * The Lab below md: the desktop's cards in one column, with par types, putting and the peak
 * game behind tabs so the phone shows one at a time.
 */
export function LabMobileLayout({ vm }: { vm: LabPageViewModel }) {
  const target = vm.goal?.target ?? null;
  const label = goalLabel(target);
  const savers = vm.goal?.savers ?? [];

  return (
    <div className="flex flex-col gap-6 pt-2 pb-6">
      <div>
        <PageTitle>The Lab</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">Your blueprint to lower scores.</p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel className="mb-1">Your Goal</SectionLabel>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Set Your Target</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalPicker
              value={target}
              onChange={vm.setGoal}
              disabled={vm.savingGoal}
              spacing={1.5}
              className="flex-wrap"
            />
          </CardContent>
        </Card>
        <GoalStandingCard goal={vm.goal} />
        {target != null && vm.attempts.length >= MIN_ATTEMPTS && (
          <AttemptsCard attempts={vm.attempts} target={target} timesMet={vm.roundsMeetingGoal} />
        )}
      </section>

      {savers.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel className="mb-1">Where to Find Strokes</SectionLabel>
          {savers.map((saver) => (
            <SaverCard key={saver.kind} saver={saver} />
          ))}
        </section>
      )}

      <section>
        <SectionLabel className="mb-3">Benchmark Analysis</SectionLabel>
        <PerformanceShapeCard
          mode={vm.radarMode}
          onModeChange={vm.setRadarMode}
          peak={vm.peak}
          goalLabel={label}
          scoringAverage={vm.scoringAverage}
          bestScore={vm.bestScore}
          recentTrend={vm.recentTrend}
          comparison={vm.comparison}
          onComparisonChange={vm.setComparison}
          friends={vm.friends}
          selectedFriend={vm.selectedFriend}
          onSelectFriend={vm.selectFriend}
          friendComparison={vm.friendComparison}
          radar={vm.radar}
          compared={vm.benchmark != null}
          missingAxes={vm.missingAxes}
          compact
        />
      </section>

      {vm.panel && (
        <section data-slot="lab-performance">
          <SectionLabel className="mb-3">Performance</SectionLabel>
          {vm.panels.length > 1 && (
            <ToggleGroup
              data-slot="lab-panels"
              aria-label="Performance panel"
              variant="outline"
              size="sm"
              value={[vm.panel]}
              onValueChange={(values) => {
                // Tapping the open tab would empty the group; one panel is always open.
                const next = vm.panels.find((panel) => panel === values[0]);
                if (next) vm.setPanel(next);
              }}
              className="mb-3"
            >
              {vm.panels.map((panel) => (
                <ToggleGroupItem key={panel} value={panel}>
                  {LAB_PANEL_LABEL[panel]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <LabPanelContent panel={vm.panel} vm={vm} goalLabel={label} />
        </section>
      )}
    </div>
  );
}

function LabPanelContent({ panel, vm, goalLabel }: { panel: LabPanel; vm: LabPageViewModel; goalLabel: string | null }) {
  if (panel === "by-par") {
    return (
      <ParTypeCard
        rows={vm.parTypes}
        benchmarkName={vm.benchmark ? benchmarkName(vm.radarMode, vm.comparison, vm.selectedFriend) : null}
      />
    );
  }
  if (panel === "putting") return vm.putting && <PuttingCard putting={vm.putting} />;
  return vm.peak && <PeakGameCard peak={vm.peak} impacts={vm.peakImpacts} goalLabel={goalLabel} />;
}
