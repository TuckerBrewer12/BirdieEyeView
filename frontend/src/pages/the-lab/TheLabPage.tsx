import { Alert, AlertAction, AlertDescription, Button, LoadingState, PageHeader } from "@/brand";
import { LabDesktopLayout } from "./components/LabDesktopLayout";
import { LegacyMobileLab } from "./LegacyMobileLab";
import { useLabPageViewModel } from "./useLabPageViewModel";

export function TheLabPage({ userId }: { userId: string }) {
  const vm = useLabPageViewModel(userId);

  if (vm.loading) return <LoadingState>Loading The Lab…</LoadingState>;

  if (!vm.analytics) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{vm.error?.message ?? "The Lab failed to load."}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={vm.retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <>
      {vm.goalSaveError && (
        <p role="alert" className="text-label font-medium text-destructive">
          {vm.goalSaveError.message || "Couldn't save your goal."}
        </p>
      )}
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <LegacyMobileLab vm={vm} />
      </div>
      <div className="hidden md:block">
        <PageHeader title="The Lab" subtitle="Your blueprint to lower scores." revealAt={100} />
        <LabDesktopLayout vm={vm} />
      </div>
    </>
  );
}
