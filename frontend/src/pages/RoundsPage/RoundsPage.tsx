import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ErrorBanner,
  Button,
  FilterChip,
  FilterChipRow,
  PageTitle,
  Panel,
  RoundPreview,
  SearchField,
  SortControl,
  useTheme,
} from "@/brand";
import { CourseLinkSearch } from "@/components/CourseLinkSearch";
import { formatCourseName } from "@/lib/courseName";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoundsPageViewModel } from "./useRoundsPageViewModel";

interface RoundsPageProps { userId: string; }

export function RoundsPage({ userId }: RoundsPageProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const viewModel = useRoundsPageViewModel(userId);

  if (viewModel.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading rounds...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Rounds" subtitle={`${viewModel.rounds.length} rounds played`} scrollThreshold={100} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>

        <PageTitle>Rounds</PageTitle>

        <SearchField
          placeholder="Search by course…"
          value={viewModel.search}
          onChange={viewModel.setSearch}
        />

        <FilterChipRow>
          {viewModel.chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              active={chip.active}
              onClick={() => viewModel.setFilterMode(chip.active ? "all" : chip.mode)}
            />
          ))}
        </FilterChipRow>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.fg }}>
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
          <ErrorBanner>{viewModel.linkError}</ErrorBanner>
        )}

        {viewModel.filteredRounds.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", fontSize: 14, color: theme.fgMuted }}>
            No rounds found.
          </div>
        ) : (
          viewModel.visibleRounds.map((r) => {
            return (
              <Fragment key={r.id}>
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

                <AnimatePresence>
                  {viewModel.linkingRoundId === r.id && (
                    <motion.div
                      key={`${r.id}-link`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <Panel tone="info">
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
                      </Panel>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })
        )}

        {viewModel.remainingCount > 0 && (
          <Button block onClick={viewModel.loadMore}>
            Load more ({viewModel.remainingCount} remaining)
          </Button>
        )}
      </div>

    </div>
  );
}
