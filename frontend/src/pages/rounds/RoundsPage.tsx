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
      <PageHeader title="Rounds" subtitle={viewModel.headerSubtitle} scrollThreshold={100} />

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
            {viewModel.resultCountLabel}
          </span>
          <SortControl
            label={viewModel.sortLabel}
            value={viewModel.effectiveSortKey}
            options={viewModel.sortOptions}
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
                  if (viewModel.isLinkOpen(r.id)) return;
                  navigate(`/rounds/${r.id}`);
                }}
                onLinkClick={() => viewModel.toggleLink(r.id)}
              />

              <Collapse open={viewModel.isLinkOpen(r.id)}>
                <CourseLinkSearch
                  title={viewModel.linkTitleFor(r)}
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
