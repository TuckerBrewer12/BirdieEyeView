import type { User } from "@/types/golf";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import { PageTitle } from "./PageTitle";

interface ProfileHeroBannerProps {
  user: User | null;
  handicapIndex: number | null;
  handicapLabel: string;
  firstName: string;
  onHandicapClick?: () => void;
}

function initialsFor(user: User | null): string {
  if (!user?.name) return "G";
  return user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileHeroBanner({
  user,
  handicapIndex,
  handicapLabel,
  firstName,
  onHandicapClick,
}: ProfileHeroBannerProps) {
  const initials = initialsFor(user);

  return (
    <Card data-slot="profile-hero-banner">
      <CardContent>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted">
              <span className="text-xl font-bold tracking-kicker text-secondary-foreground">
                {initials}
              </span>
            </div>
            <div>
              <div className="mb-1 text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
                Welcome back
              </div>
              <PageTitle size="lg">Hello, {firstName}</PageTitle>
            </div>
          </div>

          {handicapIndex != null && (
            <Button
              type="button"
              variant="outline"
              onClick={onHandicapClick}
              className="h-auto min-w-36 flex-col items-start gap-1 px-4 py-4"
            >
              <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
                Handicap
              </div>
              <div className="flex items-baseline gap-1 text-3xl font-black leading-none text-card-foreground">
                {handicapLabel}
                <span className="text-sm font-semibold tracking-wide text-muted-foreground">
                  HCP
                </span>
              </div>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
