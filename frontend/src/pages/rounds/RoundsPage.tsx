import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react";
import {
  Button,
  Card,
  Collapse,
  Collection,
  LoadingState,
  PageHeader,
  PageTitle,
  RoundPreview,
  SearchField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SortControl,
  ToggleGroup,
  ToggleGroupItem,
  useFromBreakpoint,
} from "@/brand";
import { pluralize } from "@/domain/format";
import { formatCourseName } from "@/domain/course";
import { LinkCoursePanel } from "./components/LinkCoursePanel";
import { useRoundsPageViewModel } from "./useRoundsPageViewModel";

interface RoundsPageProps { userId: string; }

export function RoundsPage({ userId }: RoundsPageProps) {
  const navigate = useNavigate();
  const viewModel = useRoundsPageViewModel(userId);
  // What the screen holds, not how it looks: a wide screen keeps the search out and links under the
  // row; a phone opens the search from an icon and links in a sheet.
  const linkInline = useFromBreakpoint("md");

  if (viewModel.loading) {
    return <LoadingState>Loading rounds...</LoadingState>;
  }

  const sort = {
    label: viewModel.sortLabel,
    value: viewModel.sortKey,
    options: viewModel.sortOptions,
    onChange: viewModel.selectSort,
    prefix: "Sort",
    phoneIcon: <ArrowUpDown />,
    quiet: true,
    size: "default",
  } as const;

  return (
    <div>
      <PageHeader title="Rounds" subtitle={pluralize(viewModel.filteredRounds.length, "round")} revealAt={100} />

      <div className="flex flex-col gap-3.5 pb-6 md:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <PageTitle>Rounds</PageTitle>
            <span data-slot="round-count" className="text-body-lg font-semibold text-muted-foreground">
              {viewModel.filteredRounds.length}
            </span>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              aria-pressed={viewModel.searchOpen}
              onClick={viewModel.toggleSearch}
            >
              <Search />
            </Button>
            <SortControl {...sort} className="md:hidden" />
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2.5">
          {/* A phone opens the search from its icon, and the field takes the caret as it appears. */}
          {(linkInline || viewModel.searchOpen) && (
            <SearchField
              placeholder="Search"
              aria-label="Search rounds"
              value={viewModel.search}
              onChange={viewModel.setSearch}
              focusOnOpen={!linkInline}
              className="md:max-w-80 md:flex-1"
            />
          )}
          <div className="flex items-center gap-2 md:contents">
            <ToggleGroup
              aria-label="Scope"
              value={[viewModel.scope]}
              onValueChange={(values: string[]) => viewModel.pickScope(values[0])}
              className="w-full md:w-fit"
            >
              {viewModel.scopeOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="min-w-0 flex-1 basis-0 md:flex-none md:basis-auto"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <SortControl
              label={viewModel.courseLabel}
              phoneLabel="Course"
              value={viewModel.course}
              options={viewModel.courseOptions}
              onChange={viewModel.setCourse}
              aria-label="Course"
              size="default"
              className="shrink-0"
            />
          </div>
          <SortControl {...sort} className="hidden md:ml-auto md:inline-flex" />
        </div>

        <Card className="gap-0 py-0">
          <Collection
            layout="divided"
            items={viewModel.visibleRounds}
            keyFor={(r) => r.id}
            empty="No rounds found."
            renderItem={(r) => (
              <div>
                <RoundPreview
                  round={r}
                  onClick={() => void navigate(`/rounds/${r.id}`)}
                  onLinkClick={() => viewModel.toggleLink(r.id)}
                />
                {linkInline && (
                  <Collapse open={viewModel.isLinkOpen(r.id)}>
                    <div className="max-w-115 pr-5 pb-4 pl-18">
                      <LinkCoursePanel
                        userId={userId}
                        roundId={r.id}
                        onClose={viewModel.closeLink}
                        onLinked={viewModel.closeLink}
                      />
                    </div>
                  </Collapse>
                )}
              </div>
            )}
          />
        </Card>

        {viewModel.remainingCount > 0 && (
          <Button variant="outline" className="w-full" onClick={viewModel.loadMore}>
            Load more ({viewModel.remainingCount} remaining)
          </Button>
        )}
      </div>

      {!linkInline && (
        <Sheet
          open={viewModel.linking != null}
          onOpenChange={(open) => {
            if (!open) viewModel.closeLink();
          }}
        >
          <SheetContent side="bottom" data-slot="link-sheet" className="px-4 pb-8">
            <SheetHeader>
              <SheetTitle>Link to a course</SheetTitle>
              <SheetDescription>{viewModel.linking?.line}</SheetDescription>
            </SheetHeader>
            {viewModel.linking && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <LinkCoursePanel
                    userId={userId}
                    roundId={viewModel.linking.id}
                    onClose={viewModel.closeLink}
                    onLinked={viewModel.closeLink}
                    surface="plain"
                  />
                </div>
                <Button variant="outline" size="lg" className="w-full" onClick={viewModel.closeLink}>
                  {viewModel.linking.courseName
                    ? `Keep as “${formatCourseName(viewModel.linking.courseName)}”`
                    : "Leave it unlinked"}
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
