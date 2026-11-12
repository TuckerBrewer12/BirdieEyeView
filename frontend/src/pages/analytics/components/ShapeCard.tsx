import { ArrowDown } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button, Card, CardAction, CardHeader, CardTitle, PickerMenu, RadarChart, StatValue, ToggleGroup, ToggleGroupItem } from "@/brand";
import { verdictTextClass } from "@/brand/theme";
import type { ProfileViewModel } from "../useProfileViewModel";
import {
  RADAR_MODES,
  comparisonFromKey,
  comparisonKey,
  comparisonName,
  comparisonOptions,
  SHAPE_COPY,
  friendNote,
  shapeLabel,
  standingGroups,
  standingLines,
} from "../profilePresent";

/**
 * The golfer's shape on the radar against a handicap, a friend or their peak: the axes ahead and
 * behind beside it, and a way down to where the strokes are.
 */
export function ShapeCard({ profile, improveId }: { profile: ProfileViewModel; improveId: string | null }) {
  const name = comparisonName(profile.radarMode, profile.comparison, profile.selectedFriend);
  const note = profile.friendComparison ? friendNote(profile.friendComparison, profile.selectedFriend) : null;
  const options = comparisonOptions(profile.friends);
  const { ahead, judged } = profile.standing;
  const showStanding = profile.compared && judged > 0;
  const lines = standingLines(judged, name);

  return (
    <Card size="lg" data-slot="shape-card" className="@container gap-4 px-(--card-spacing)">
      {/* The card's own padding holds the radar's container, so the header takes none of its own. */}
      <CardHeader className="items-center px-0">
        <CardTitle level={2} className="text-body-lg font-semibold">
          {SHAPE_COPY.title}
        </CardTitle>
        <CardAction wrap className="flex items-center gap-2">
          {profile.peakAvailable && (
            <ToggleGroup
              size="sm"
              aria-label={SHAPE_COPY.mode}
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
              aria-label={SHAPE_COPY.compareWith}
              size="sm"
              prefix={SHAPE_COPY.compareWithPrefix}
              label={name ?? ""}
              value={comparisonKey(profile.comparison, profile.selectedFriend)}
              options={options}
              onChange={(key) => {
                const picked = comparisonFromKey(key);
                if (picked) profile.pickComparison(picked.value, picked.friendId);
              }}
            />
          )}
        </CardAction>
      </CardHeader>

      {note && <p className="text-body text-muted-foreground">{note}</p>}

      <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-center @3xl:gap-8">
        <RadarChart
          className="@3xl:max-w-radar"
          aria-label={shapeLabel(name)}
          benchmarkTone={profile.comparison === "friend" && profile.radarMode === "benchmark" ? "friend" : "benchmark"}
          axes={profile.radar.map((entry) => ({
            label: entry.axis,
            value: entry.value,
            benchmark: profile.compared ? entry.benchmark : null,
            verdict: entry.verdict,
            valueLabel: entry.userRaw,
            benchmarkLabel: entry.benchRaw,
          }))}
          empty={SHAPE_COPY.empty}
        />

        {showStanding && (
          <div data-slot="shape-standing" className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-baseline gap-1.5">
                <StatValue size="card">{ahead.length}</StatValue>
                <span className="text-body-lg font-semibold text-muted-foreground">{lines.of}</span>
              </span>
              <span className="text-body text-foreground-secondary">{lines.ahead}</span>
            </div>
            {standingGroups(profile.standing).map((group) => (
              <div key={group.title} className="flex flex-col gap-2 border-t border-border pt-3">
                <span className={cn("text-eyebrow uppercase", verdictTextClass(group.tone))}>{group.title}</span>
                {group.rows.map((row) => (
                  <div key={row.axis} className="flex justify-between text-body-lg">
                    <span>{row.axis}</span>
                    <b className={verdictTextClass(group.tone)}>{row.gap}</b>
                  </div>
                ))}
              </div>
            ))}
            {improveId != null && (
              <Button
                className="self-start"
                onClick={() => document.getElementById(improveId)?.scrollIntoView({ behavior: "smooth" })}
              >
                {SHAPE_COPY.improve}
                <ArrowDown data-icon="inline-end" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
