import { Card, CardContent, CardHeader, CardTitle, RadarChart } from "@/brand";
import type { RadarEntry } from "@/domain";
import { profileAxes } from "../present";

interface PlayerProfileCardProps {
  profile: RadarEntry[];
  compact?: boolean;
  className?: string;
}

export function PlayerProfileCard({ profile, compact = false, className }: PlayerProfileCardProps) {
  return (
    <Card data-slot="player-profile-card" className={className}>
      <CardHeader>
        <CardTitle>Player Profile</CardTitle>
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
