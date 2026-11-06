import { Card, CardContent, CardDescription, CardHeader, CardTitle, RadarChart } from "@/brand";
import type { RadarEntry } from "@/domain";
import { profileAxes } from "../present";

interface PlayerProfileCardProps {
  /** The radar's axes the golfer has figures for. */
  profile: RadarEntry[];
  /** The phone's narrower drawing. */
  compact?: boolean;
  className?: string;
}

/** The golfer's shape across ball striking, the short game, putting and each par type. */
export function PlayerProfileCard({ profile, compact = false, className }: PlayerProfileCardProps) {
  return (
    <Card data-slot="player-profile-card" className={className}>
      <CardHeader>
        <CardTitle>Player Profile</CardTitle>
        <CardDescription>Further out is better</CardDescription>
      </CardHeader>
      <CardContent>
        <RadarChart
          axes={profileAxes(profile)}
          empty="Play a few more rounds to build your profile."
          compact={compact}
          aria-label="Your player profile"
        />
      </CardContent>
    </Card>
  );
}
