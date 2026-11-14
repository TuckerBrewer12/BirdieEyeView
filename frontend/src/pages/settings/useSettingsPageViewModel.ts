import { useCallback, useMemo, useState } from "react";
import { useUpdateUser } from "@/data/useUpdateUser";
import { formatHandicapInputValue, parseHandicapInput } from "@/domain/handicap";
import { useCourseSearch } from "@/data/useCourseSearch";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/domain/course";
import { formChanged, type HomeCourse, type SettingsForm } from "./model";
import { settingsRepository, type SettingsRepository } from "./settingsRepository";
import { useSettings } from "./useSettings";

export interface SettingsPageViewModel {
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  friendCode: string | null;
  handicapInput: string;
  handicapError: string | null;
  setHandicapInput: (value: string) => void;
  homeCourse: HomeCourse | null;
  homeCourseOpen: boolean;
  openHomeCourse: () => void;
  closeHomeCourse: () => void;
  courseQuery: string;
  courseResults: CourseSummary[];
  searchingCourses: boolean;
  setCourseQuery: (query: string) => void;
  pickHomeCourse: (course: CourseSummary) => void;
  clearHomeCourse: () => void;
  getUpdates: boolean;
  setGetUpdates: (on: boolean) => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  saveError: string | null;
  saved: boolean;
  save: (onSaved?: () => void) => void;
  discard: () => void;
}

export function useSettingsPageViewModel(
  userId: string,
  repository: SettingsRepository = settingsRepository,
): SettingsPageViewModel {
  const { data: settings, isLoading: loading, error: loadError, refetch } = useSettings(userId, repository);
  const updateUser = useUpdateUser(userId, repository);
  const courseSearch = useCourseSearch(userId, repository);
  const [device, setDevice] = useState(() => repository.readDevicePreferences());
  const [edits, setEdits] = useState<Partial<SettingsForm>>({});
  const [homeCourseOpen, setHomeCourseOpen] = useState(false);

  const saved = useMemo<SettingsForm>(
    () => ({
      handicapInput: formatHandicapInputValue(settings?.handicap),
      homeCourse: settings?.homeCourse ?? null,
      ...device,
    }),
    [settings, device],
  );
  const form: SettingsForm = { ...saved, ...edits };
  const dirty = settings != null && formChanged(form, saved);
  const handicapError = parseHandicapInput(form.handicapInput).error;

  const edit = useCallback((change: Partial<SettingsForm>) => {
    setEdits((prev) => ({ ...prev, ...change }));
  }, []);

  const { reset: resetSearch } = courseSearch;
  const pickHomeCourse = useCallback(
    (course: CourseSummary) => {
      edit({ homeCourse: { id: course.id, name: course.name } });
      resetSearch();
      setHomeCourseOpen(false);
    },
    [edit, resetSearch],
  );

  const { mutate, reset: resetSave } = updateUser;
  const save = (onSaved?: () => void) => {
    const handicap = parseHandicapInput(form.handicapInput);
    if (handicap.error) return;
    const preferences = { getUpdates: form.getUpdates };
    mutate(
      { handicap: handicap.value, home_course_id: form.homeCourse?.id ?? null },
      {
        onSuccess: () => {
          repository.saveDevicePreferences(preferences);
          setDevice(preferences);
          setEdits({});
          onSaved?.();
        },
      },
    );
  };

  const discard = useCallback(() => {
    setEdits({});
    resetSearch();
    resetSave();
  }, [resetSearch, resetSave]);

  return {
    loading,
    loadError: loadError ? messageFrom(loadError, "Could not load your settings.") : null,
    retry: () => void refetch(),
    friendCode: settings?.friendCode ?? null,
    handicapInput: form.handicapInput,
    handicapError,
    setHandicapInput: (handicapInput) => edit({ handicapInput }),
    homeCourse: form.homeCourse,
    homeCourseOpen,
    openHomeCourse: () => setHomeCourseOpen(true),
    closeHomeCourse: () => {
      setHomeCourseOpen(false);
      resetSearch();
    },
    courseQuery: courseSearch.query,
    courseResults: courseSearch.results,
    searchingCourses: courseSearch.searching,
    setCourseQuery: courseSearch.setQuery,
    pickHomeCourse,
    clearHomeCourse: () => edit({ homeCourse: null }),
    getUpdates: form.getUpdates,
    setGetUpdates: (getUpdates) => edit({ getUpdates }),
    dirty,
    canSave: dirty && handicapError == null && !updateUser.isPending,
    saving: updateUser.isPending,
    saveError: updateUser.error ? messageFrom(updateUser.error, "Could not save your settings.") : null,
    saved: updateUser.isSuccess && !dirty,
    save,
    discard,
  };
}
