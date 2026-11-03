import { useId } from "react";
import {
  Card,
  RadarChart,
  Stat,
  StatLabel,
  StatValue,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { formatCourseName, formatOneDecimal, pluralize, type ComparisonTargetValue, type RadarEntry } from "@/domain";
import type { FriendComparison } from "../useLabPageViewModel";
import type { FriendOption, PeakGame, RadarMode } from "../model";
import {
  COMPARISON_OPTIONS,
  benchmarkHeading,
  benchmarkName,
  comparisonFromKey,
  comparisonKey,
  friendName,
  peakGapNote,
  recentTrendNote,
} from "../present";

export interface PerformanceShapeCardProps {
  mode: RadarMode;
  onModeChange: (mode: RadarMode) => void;
  /** Peak needs a goal and two scored rounds. */
  peak: PeakGame | null;
  goalLabel: string | null;
  scoringAverage: number | null;
  bestScore: number | null;
  recentTrend: number | null;
  comparison: ComparisonTargetValue;
  onComparisonChange: (target: ComparisonTargetValue) => void;
  friends: FriendOption[];
  selectedFriend: FriendOption | null;
  onSelectFriend: (friendId: string) => void;
  friendComparison: FriendComparison | null;
  /** The axes the golfer has figures for, against the comparison when there is one. */
  radar: RadarEntry[];
  compared: boolean;
  missingAxes: string[];
  /** On a phone: the radar's compact drawing. */
  compact?: boolean;
}

const MODES: { value: RadarMode; label: string }[] = [
  { value: "benchmark", label: "Your Average" },
  { value: "peak", label: "Peak Game" },
];

function friendNote(state: FriendComparison, friend: FriendOption | null): string | null {
  if (state === "no-friends") return "Add friends in Social to compare with them.";
  if (state === "loading") return `Loading ${friendName(friend)}'s rounds…`;
  if (state === "no-rounds") return `${friendName(friend)} needs more rounds to compare against.`;
  return null;
}

/** The golfer's shape on the radar, beside the controls that pick what it is held up against. */
export function PerformanceShapeCard(props: PerformanceShapeCardProps) {
  const { mode, peak, comparison, selectedFriend, friendComparison, radar, compared, missingAxes } = props;
  const legend = compared ? benchmarkName(mode, comparison, selectedFriend) : null;
  const note = friendComparison ? friendNote(friendComparison, selectedFriend) : null;
  const compareLabelId = useId();

  return (
    <Card data-slot="performance-shape" className="@container py-0">
      <div className="flex flex-col divide-y divide-border @3xl:flex-row @3xl:divide-x @3xl:divide-y-0">
        <div className="flex w-full shrink-0 flex-col gap-4 p-5 @3xl:w-72">
          <p className="text-base font-bold text-card-foreground">
            {benchmarkHeading(mode, comparison, selectedFriend, peak)}
          </p>

          <ToggleGroup
            aria-label="Shape to show"
            variant="outline"
            size="sm"
            spacing={0}
            value={[mode]}
            onValueChange={(values) => {
              const next = MODES.find((m) => m.value === values[0]);
              if (next) props.onModeChange(next.value);
            }}
            className="w-full"
          >
            {MODES.map((m) => (
              <ToggleGroupItem
                key={m.value}
                value={m.value}
                disabled={m.value === "peak" && !peak}
                className="flex-1"
              >
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {mode === "benchmark" ? (
            <div className="flex flex-col gap-3">
              <Stat>
                <StatLabel>Your Average</StatLabel>
                <StatValue size="lg">{formatOneDecimal(props.scoringAverage)}</StatValue>
                <span className="text-caption text-muted-foreground">
                  avg · L20 rounds
                  {props.bestScore != null && ` · ${props.bestScore} best`}
                </span>
              </Stat>
              {props.recentTrend != null && (
                <p className="rounded-lg bg-muted px-3 py-2 text-label text-secondary-foreground">
                  {recentTrendNote(props.recentTrend)}
                </p>
              )}
            </div>
          ) : (
            peak && (
              <div className="flex flex-col gap-3">
                <Stat>
                  <StatLabel>Peak Game</StatLabel>
                  <StatValue size="lg">{formatOneDecimal(peak.average)}</StatValue>
                  <span className="text-caption text-muted-foreground">
                    avg · best {pluralize(peak.rounds.length, "round")} · overall {formatOneDecimal(peak.overallAverage)}
                  </span>
                </Stat>
                {props.goalLabel && (
                  <p className="rounded-lg bg-muted px-3 py-2 text-label text-secondary-foreground">
                    {peakGapNote(peak, props.goalLabel)}
                  </p>
                )}
                <ul className="flex flex-col gap-1.5 border-t border-border pt-2">
                  {peak.rounds.map((round, i) => (
                    <li key={round.roundId ?? i} className="flex justify-between gap-2 text-label">
                      <span className="truncate text-muted-foreground">
                        {round.courseName ? formatCourseName(round.courseName) : `Round ${i + 1}`}
                      </span>
                      <span className="font-mono font-bold text-card-foreground">{round.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {mode === "benchmark" && (
            <div className="flex flex-col gap-2">
              <span
                id={compareLabelId}
                className="text-eyebrow uppercase text-muted-foreground"
              >
                Compare vs.
              </span>
              <ToggleGroup
                data-slot="comparison-picker"
                aria-labelledby={compareLabelId}
                variant="outline"
                size="sm"
                value={[comparisonKey(comparison)]}
                onValueChange={(values) => {
                  const next = comparisonFromKey(values[0]);
                  if (next) props.onComparisonChange(next.value);
                }}
                className="w-full flex-wrap"
              >
                {COMPARISON_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option.key} value={option.key}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {comparison === "friend" && props.friends.length > 0 && (
                <ToggleGroup
                  data-slot="friend-picker"
                  aria-label="Friend to compare with"
                  variant="outline"
                  size="sm"
                  value={selectedFriend ? [selectedFriend.id] : []}
                  onValueChange={(values) => {
                    if (values[0]) props.onSelectFriend(values[0]);
                  }}
                  className="w-full flex-wrap"
                >
                  {props.friends.map((friend) => (
                    <ToggleGroupItem key={friend.id} value={friend.id}>
                      {friendName(friend)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              {note && <p className="text-label text-muted-foreground">{note}</p>}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-1.5 pt-2 text-label text-muted-foreground">
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm bg-primary" />
              You
            </span>
            {legend && (
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-sm bg-muted-foreground/40" />
                {legend}
              </span>
            )}
            {missingAxes.length > 0 && (
              <p className="mt-1 rounded-lg bg-muted px-2 py-1.5 text-caption">
                No {missingAxes.join(", ")} data yet.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-5">
          <RadarChart
            axes={radar.map((entry) => ({
              label: entry.axis,
              value: entry.value,
              benchmark: compared ? entry.benchmark : null,
              valueLabel: entry.userRaw,
              benchmarkLabel: entry.benchRaw,
            }))}
            empty="Play a few more rounds to build your performance shape."
            compact={props.compact}
            aria-label={legend ? `Your shape against ${legend}` : "Your performance shape"}
          />
        </div>
      </div>
    </Card>
  );
}
