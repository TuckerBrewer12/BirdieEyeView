import { useNavigate } from "react-router-dom";
import { Alert, AlertAction, AlertDescription, Button, EmptyNote, LoadingState, PageHeader, PageTitle } from "@/brand";
import { CareerDesktopLayout } from "./components/CareerDesktopLayout";
import { CareerMobileLayout } from "./components/CareerMobileLayout";
import { EMPTY_MESSAGE, PAGE_SUBTITLE } from "./present";
import { useCareerPageViewModel } from "./useCareerPageViewModel";

export function CareerPage({ userId }: { userId: string }) {
  const vm = useCareerPageViewModel(userId);
  const navigate = useNavigate();

  if (vm.loading) return <LoadingState>Loading career…</LoadingState>;

  if (!vm.career || !vm.figures) {
    return (
      <Alert tone="danger">
        <AlertDescription>{vm.loadError ?? "Could not load your career."}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={vm.retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (vm.showEmpty) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        <PageTitle>Career</PageTitle>
        <EmptyNote className="py-16">{EMPTY_MESSAGE}</EmptyNote>
      </div>
    );
  }

  const layout = {
    vm,
    career: vm.career,
    figures: vm.figures,
    onOpenRound: (roundId: string) => navigate(`/rounds/${roundId}`),
  };

  return (
    <>
      <PageHeader title="Career" subtitle={PAGE_SUBTITLE} revealAt={100} />
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <CareerMobileLayout {...layout} />
      </div>
      <div className="hidden md:block">
        <CareerDesktopLayout {...layout} />
      </div>
    </>
  );
}
