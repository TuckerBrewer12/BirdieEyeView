import { Alert, AlertAction, AlertDescription, Button, LoadingState } from "@/brand";
import { saversHeading } from "../profilePresent";
import type { ProfileViewModel } from "../useProfileViewModel";
import { GoalCard } from "./GoalCard";
import { PeakCard } from "./PeakCard";
import { SaversCard } from "./SaversCard";
import { ShapeCard } from "./ShapeCard";

const IMPROVE_ID = "improve";

export function ProfileSection({ profile }: { profile: ProfileViewModel }) {
  if (profile.loading) return <LoadingState>Loading your profile...</LoadingState>;
  if (profile.error) {
    return (
      <Alert tone="danger">
        <AlertDescription>Could not load your profile.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={profile.retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  const goal = profile.goal;
  const hasSavers = goal != null && saversHeading(goal) != null && goal.savers.length > 0;
  return (
    <div data-slot="profile-section" className="flex flex-col gap-4">
      <p className="px-1 text-body-sm text-muted-foreground">Your last 20 rounds at every course.</p>
      <GoalCard
        goal={goal}
        onGoalChange={profile.setGoal}
        saving={profile.savingGoal}
        saveError={profile.goalSaveError}
      />
      <ShapeCard profile={profile} improveId={hasSavers ? IMPROVE_ID : null} />
      {goal && <SaversCard goal={goal} id={IMPROVE_ID} />}
      {goal && profile.peak && <PeakCard peak={profile.peak} impacts={profile.peakImpacts} target={goal.target} />}
    </div>
  );
}
