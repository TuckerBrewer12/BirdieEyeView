import {
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  LoadingState,
  PageHeader,
  PageTitle,
} from "@/brand";
import { useTheme } from "@/context/theme";
import { FriendCodeSection } from "./components/FriendCodeSection";
import { HandicapSection } from "./components/HandicapSection";
import { HomeCourseSection } from "./components/HomeCourseSection";
import { PreferencesSection } from "./components/PreferencesSection";
import { UnsavedChangesSheet } from "./components/UnsavedChangesSheet";
import { useLeaveGuard } from "./useLeaveGuard";
import { useSettingsPageViewModel } from "./useSettingsPageViewModel";

export function SettingsPage({ userId }: { userId: string }) {
  const viewModel = useSettingsPageViewModel(userId);
  const { preference: theme, setPreference: setTheme } = useTheme();
  const guard = useLeaveGuard(viewModel.dirty);

  if (viewModel.loading) return <LoadingState>Loading settings…</LoadingState>;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage account preferences" revealAt={100} />

      <div className="flex max-w-3xl flex-col gap-4 pb-6">
        <PageTitle>Settings</PageTitle>

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
            <FriendCodeSection friendCode={viewModel.friendCode} />
            <HandicapSection
              value={viewModel.handicapInput}
              error={viewModel.handicapError}
              onChange={viewModel.setHandicapInput}
            />
            <HomeCourseSection
              homeCourse={viewModel.homeCourse}
              query={viewModel.courseQuery}
              results={viewModel.courseResults}
              searching={viewModel.searchingCourses}
              onQueryChange={viewModel.setCourseQuery}
              onPick={viewModel.pickHomeCourse}
              onClear={viewModel.clearHomeCourse}
            />
            <PreferencesSection
              theme={theme}
              onThemeChange={setTheme}
              getUpdates={viewModel.getUpdates}
              onGetUpdatesChange={viewModel.setGetUpdates}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => viewModel.save()} disabled={!viewModel.canSave}>
                {viewModel.saving ? "Saving…" : "Save settings"}
              </Button>
              {viewModel.saved && <span className="text-sm text-muted-foreground">Settings saved.</span>}
              {viewModel.saveError && !guard.blocked && (
                <span role="alert" className="text-sm font-medium text-destructive">
                  {viewModel.saveError}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <UnsavedChangesSheet
        open={guard.blocked}
        saving={viewModel.saving}
        error={viewModel.saveError}
        onSave={() => viewModel.save(guard.leave)}
        onDiscard={() => {
          viewModel.discard();
          guard.leave();
        }}
        onStay={guard.stay}
      />
    </div>
  );
}
