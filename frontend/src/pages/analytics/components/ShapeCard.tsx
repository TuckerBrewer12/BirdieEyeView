import { ArrowDown } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button, Card, CardTitle, PickerMenu, RadarChart, StatValue, ToggleGroup, ToggleGroupItem } from "@/brand";
import type { Profile } from "../useProfile";
import {
  RADAR_MODES,
  comparisonFromKey,
  comparisonKey,
  comparisonName,
  comparisonOptions,
  friendNote,
  gapPoints,
  standingGroups,
} from "../profilePresent";

const GROUP_TONE = { good: "text-primary", bad: "text-score-bogey" } as const;

/**
 * The golfer's shape on the radar against a handicap, a friend or their peak: the axes ahead and
 * behind beside it, and a way down to where the strokes are.
 */
export function ShapeCard({ profile, improveId }: { profile: Profile; improveId: string | null }) {
  const name = comparisonName(profile.radarMode, profile.comparison, profile.selectedFriend);
  const note = profile.friendComparison ? friendNote(profile.friendComparison, profile.selectedFriend) : null;
  const options = comparisonOptions(profile.friends);
  const { ahead, judged } = profile.standing;
  const showStanding = profile.compared && judged > 0;

  return (
    <Card size="lg" data-slot="shape-card" className="@container gap-4 px-(--card-spacing)">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle level={2} className="text-body-lg font-semibold">
          Player profile
        </CardTitle>
        <div className="flex items-center gap-2">
          {profile.peakAvailable && (
            <ToggleGroup
              size="sm"
              aria-label="Your numbers"
              value={[profile.radarMode]}
              onValueChange={(values: string[]) => {
                const next = RADAR_MODES.find((mode) => mode.value === values[0]);
                if (next) profile.setRadarMode(next.value);
              }}
            >
              {RADAR_MODES.map((mode) => (
                <ToggleGroupItem key={mode.value} value={mode.value}>
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          {profile.radarMode === "benchmark" && profile.comparison != null && (
            <PickerMenu
              aria-label="Compare with"
              size="sm"
              prefix="vs"
              label={name ?? ""}
              value={comparisonKey(profile.comparison, profile.selectedFriend)}
              options={options}
              onChange={(key) => {
                const picked = comparisonFromKey(key);
                if (picked) profile.pickComparison(picked.value, picked.friendId);
              }}
            />
          )}
        </div>
      </div>

      {note && <p className="text-body text-muted-foreground">{note}</p>}

      <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-center @3xl:gap-8">
        <RadarChart
          className="@3xl:max-w-radar"
          aria-label={name ? `Your shape against ${name}` : "Your shape"}
          benchmarkTone={profile.comparison === "friend" && profile.radarMode === "benchmark" ? "friend" : "benchmark"}
          axes={profile.radar.map((entry) => ({
            label: entry.axis,
            value: entry.value,
            benchmark: profile.compared ? entry.benchmark : null,
            verdict: entry.verdict,
            valueLabel: entry.userRaw,
            benchmarkLabel: entry.benchRaw,
          }))}
          empty="Play a few more rounds to see your shape."
        />

        {showStanding && (
          <div data-slot="shape-standing" className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-baseline gap-1.5">
                <StatValue size="card">{ahead.length}</StatValue>
                <span className="text-body-lg font-semibold text-muted-foreground">of {judged}</span>
              </span>
              <span className="text-body text-foreground-secondary">areas ahead of {name}</span>
            </div>
            {standingGroups(profile.standing).map((group) => (
              <div key={group.title} className="flex flex-col gap-2 border-t border-border pt-3">
                <span className={cn("text-eyebrow uppercase", GROUP_TONE[group.tone])}>{group.title}</span>
                {group.rows.map((row) => (
                  <div key={row.axis} className="flex justify-between text-body-lg">
                    <span>{row.axis}</span>
                    <b className={GROUP_TONE[group.tone]}>{gapPoints(row)}</b>
                  </div>
                ))}
              </div>
            ))}
            {improveId != null && (
              <Button
                className="self-start"
                onClick={() => document.getElementById(improveId)?.scrollIntoView({ behavior: "smooth" })}
              >
                See how to improve
                <ArrowDown data-icon="inline-end" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
