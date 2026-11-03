import { Alert, AlertAction, AlertDescription, Button, LoadingState, PageHeader } from "@/brand";
import { LabDesktopLayout } from "./components/LabDesktopLayout";
import { LabMobileLayout } from "./components/LabMobileLayout";
import { useLabPageViewModel } from "./useLabPageViewModel";

export function TheLabPage({ userId }: { userId: string }) {
  const vm = useLabPageViewModel(userId);

  if (vm.loading) return <LoadingState>Loading The Lab…</LoadingState>;

  if (!vm.analytics) {
    return (
      <Alert tone="danger">
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
      <PageHeader title="The Lab" subtitle="Your blueprint to lower scores." revealAt={100} />
      {vm.goalSaveError && (
        <p role="alert" className="text-label font-medium text-destructive">
          {vm.goalSaveError.message || "Couldn't save your goal."}
        </p>
      )}
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <LabMobileLayout vm={vm} />
      </div>
      <div className="hidden md:block">
        <LabDesktopLayout vm={vm} />
      </div>
    </>
  );
}
