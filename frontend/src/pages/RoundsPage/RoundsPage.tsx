import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Collapse,
  Collection,
  LoadingState,
  PageTitle,
  RoundPreview,
  SearchField,
  SortControl,
  CourseLinkSearch,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { formatCourseName } from "@/lib/courseName";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoundsPageViewModel } from "./useRoundsPageViewModel";

interface RoundsPageProps { userId: string; }

export function RoundsPage({ userId }: RoundsPageProps) {
  const navigate = useNavigate();
  const viewModel = useRoundsPageViewModel(userId);

  if (viewModel.loading) {
    return <LoadingState>Loading rounds...</LoadingState>;
  }

  return (
    <div>
      <PageHeader title="Rounds" subtitle={`${viewModel.rounds.length} rounds played`} scrollThreshold={100} />

      <div className="flex flex-col gap-2.5 pb-6">

        <PageTitle>Rounds</PageTitle>

        <SearchField
          placeholder="Search by course…"
          value={viewModel.search}
          onChange={viewModel.setSearch}
        />

        <ToggleGroup
          variant="outline"
          spacing={2}
          value={[viewModel.filterMode]}
          onValueChange={(values) => viewModel.setFilterMode(values[0] ?? "all")}
          className="max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {viewModel.chips.map((chip) => (
            <ToggleGroupItem key={chip.key} value={chip.mode}>
              {chip.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className="text-[13px] font-bold text-foreground">
            {viewModel.filteredRounds.length} {viewModel.filteredRounds.length === 1 ? "round" : "rounds"}
          </span>
          <SortControl
            label={viewModel.sortLabel}
            value={viewModel.effectiveSortKey}
            options={[
              { value: "date", label: "Date" },
              { value: "total_score", label: "Score" },
              { value: "to_par", label: "To Par" },
              { value: "course_name", label: "Course" },
            ]}
            onChange={viewModel.selectSortKey}
            ascending={viewModel.sortAsc}
            onToggleDirection={viewModel.toggleSortDirection}
            directionDisabled={viewModel.sortLocked}
          />
        </div>

        {viewModel.linkError && (
          <Alert variant="destructive">
            <AlertDescription>{viewModel.linkError}</AlertDescription>
          </Alert>
        )}

        <Collection
          items={viewModel.visibleRounds}
          keyFor={(r) => r.id}
          empty="No rounds found."
          renderItem={(r) => (
            <>
              <RoundPreview
                round={r}
                onClick={() => {
                  if (viewModel.linkingRoundId === r.id) return;
                  navigate(`/rounds/${r.id}`);
                }}
                onLinkClick={() => {
                  if (viewModel.linkingRoundId === r.id) viewModel.closeLink();
                  else viewModel.openLink(r.id);
                }}
              />

              <Collapse open={viewModel.linkingRoundId === r.id}>
                <CourseLinkSearch
                  title={`Link "${r.course_name ? formatCourseName(r.course_name) : "this round"}" to a saved course`}
                  query={viewModel.linkQuery}
                  results={viewModel.linkResults}
                  searching={viewModel.linkSearching}
                  linking={viewModel.linking}
                  onQueryChange={viewModel.handleLinkQuery}
                  onSelectCourse={(c) => viewModel.handleSelectCourse(r.id, c)}
                  onClose={viewModel.closeLink}
                />
              </Collapse>
            </>
          )}
        />

        {viewModel.remainingCount > 0 && (
          <Button variant="outline" className="w-full" onClick={viewModel.loadMore}>
            Load more ({viewModel.remainingCount} remaining)
          </Button>
        )}
      </div>

    </div>
  );
}
