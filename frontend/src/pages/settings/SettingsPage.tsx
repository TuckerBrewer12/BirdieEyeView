import {
  ActionBar,
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  ConfirmDialog,
  LoadingState,
  PageHeader,
  PageTitle,
  SettingsGroup,
  SettingsRow,
} from "@/brand";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { courseLabel } from "@/domain/course";
import { GolfGroup } from "./components/GolfGroup";
import { HomeCourseSheet } from "./components/HomeCourseSheet";
import { PreferencesSection } from "./components/PreferencesSection";
import { useLeaveGuard } from "./useLeaveGuard";
import { useSettingsPageViewModel } from "./useSettingsPageViewModel";

export function SettingsPage({ userId }: { userId: string }) {
  const viewModel = useSettingsPageViewModel(userId, useAuth());
  const { preference: theme, setPreference: setTheme } = useTheme();
  const guard = useLeaveGuard(viewModel.dirty);

  if (viewModel.loading) return <LoadingState>Loading settings…</LoadingState>;

  return (
    <div>
      <PageHeader title="Settings" revealAt={100} />

      <div className="flex max-w-2xl flex-col gap-5 pb-6">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <PageTitle>Settings</PageTitle>
          {viewModel.saved && (
            <span role="status" className="text-sm text-muted-foreground">
              Settings saved.
            </span>
          )}
        </div>

        {viewModel.loadError ? (
          <Alert tone="danger">
            <AlertDescription>{viewModel.loadError}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={viewModel.retry}>
                Try again
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <>
            {viewModel.saveError && !guard.blocked && (
              <Alert tone="danger">
                <AlertDescription>{viewModel.saveError}</AlertDescription>
              </Alert>
            )}

            <GolfGroup
              handicap={viewModel.handicapInput}
              handicapError={viewModel.handicapError}
              onHandicapChange={viewModel.setHandicapInput}
              homeCourse={viewModel.homeCourse ? courseLabel(viewModel.homeCourse.name) : null}
              onOpenHomeCourse={viewModel.openHomeCourse}
              friendCode={viewModel.friendCode}
            />
            <PreferencesSection
              theme={theme}
              onThemeChange={setTheme}
              getUpdates={viewModel.getUpdates}
              onGetUpdatesChange={viewModel.setGetUpdates}
            />
            <SettingsGroup>
              <SettingsRow
                type="action"
                label={viewModel.signingOut ? "Signing out…" : "Sign out"}
                tone="danger"
                disabled={viewModel.signingOut}
                onClick={viewModel.signOut}
              />
            </SettingsGroup>
          </>
        )}
      </div>

      {/* While something has changed: pinned at the foot, above the tab bar on a phone. */}
      {viewModel.dirty && (
        <ActionBar pinned="always" contentClassName="max-w-2xl">
          <span className="flex-1 text-sm text-foreground-secondary">Unsaved changes</span>
          <Button variant="ghost" onClick={viewModel.discard} disabled={viewModel.saving}>
            Discard
          </Button>
          <Button onClick={() => viewModel.save()} disabled={!viewModel.canSave}>
            {viewModel.saving ? "Saving…" : "Save"}
          </Button>
        </ActionBar>
      )}

      <HomeCourseSheet
        open={viewModel.homeCourseOpen}
        onClose={viewModel.closeHomeCourse}
        homeCourse={viewModel.homeCourse}
        query={viewModel.courseQuery}
        results={viewModel.courseResults}
        searching={viewModel.searchingCourses}
        onQueryChange={viewModel.setCourseQuery}
        onPick={viewModel.pickHomeCourse}
        onClear={viewModel.clearHomeCourse}
      />

      <ConfirmDialog
        open={guard.blocked}
        onOpenChange={(open) => {
          if (!open) guard.stay();
        }}
        title="Save changes before leaving?"
        tone="default"
        confirmLabel={viewModel.saving ? "Saving…" : "Save"}
        pending={viewModel.saving}
        onConfirm={() => viewModel.save(guard.leave)}
        alternative={{
          label: "Discard",
          onClick: () => {
            viewModel.discard();
            guard.leave();
          },
        }}
        cancelLabel="Keep editing"
        error={viewModel.saveError}
      />
    </div>
  );
}
