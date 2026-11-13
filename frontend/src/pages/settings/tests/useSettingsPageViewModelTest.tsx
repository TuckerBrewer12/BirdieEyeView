import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { pebbleBeach, pebbleBeachSummary, populatedCourses } from "@/testing/fixtures/courses";
import { FakeSettingsRepository, type FakeSettingsSeed } from "@/testing/fakes/FakeSettingsRepository";
import { useSettingsPageViewModel } from "../useSettingsPageViewModel";

function setup(seed: FakeSettingsSeed = {}, configure?: (repository: FakeSettingsRepository) => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const otherCourses = populatedCourses.filter((course) => course.name !== pebbleBeachSummary.name);
  const repository = new FakeSettingsRepository({ courses: [pebbleBeach, ...otherCourses], ...seed });
  configure?.(repository);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const auth = { logout: () => Promise.resolve() };
  const { result } = renderHook(() => useSettingsPageViewModel("user-1", auth, repository), { wrapper });
  return { client, repository, result };
}

async function loaded(seed?: FakeSettingsSeed, configure?: (repository: FakeSettingsRepository) => void) {
  const view = setup(seed, configure);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useSettingsPageViewModel", () => {
  it("fills the form from the saved settings and device choices", async () => {
    const { result } = await loaded({
      user: { handicap: -2.5, home_course_id: pebbleBeachSummary.id, friend_code: "ABCD-9999" },
      device: { getUpdates: false },
    });

    expect(result.current.friendCode).toBe("ABCD-9999");
    expect(result.current.handicapInput).toBe("+2.5");
    expect(result.current.homeCourse).toEqual({ id: pebbleBeachSummary.id, name: pebbleBeachSummary.name });
    expect(result.current.getUpdates).toBe(false);
    expect(result.current.dirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it("is dirty while a field differs, and clean again once it is put back", async () => {
    const { result } = await loaded({ user: { handicap: 12 } });

    act(() => result.current.setHandicapInput("10.4"));
    expect(result.current.dirty).toBe(true);
    expect(result.current.canSave).toBe(true);

    act(() => result.current.setHandicapInput("12"));
    expect(result.current.dirty).toBe(false);
  });

  it("will not save a handicap that does not parse", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setHandicapInput("abc"));
    expect(result.current.handicapError).toMatch(/between \+10 and 54/);
    expect(result.current.canSave).toBe(false);

    act(() => result.current.save());
    expect(repository.updates).toEqual([]);
  });

  it("searches courses and picks a home course", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setCourseQuery("pebble"));
    await waitFor(() => expect(result.current.courseResults.map((c) => c.name)).toEqual([pebbleBeachSummary.name]));
    expect(repository.searchQueries).toEqual(["pebble"]);

    act(() => result.current.pickHomeCourse(result.current.courseResults[0]));
    expect(result.current.homeCourse).toEqual({ id: pebbleBeachSummary.id, name: pebbleBeachSummary.name });
    expect(result.current.courseQuery).toBe("");
    expect(result.current.dirty).toBe(true);
  });

  it("closes the home course's sheet on a pick, and clears the search when closed without one", async () => {
    const { result } = await loaded();

    act(() => result.current.openHomeCourse());
    expect(result.current.homeCourseOpen).toBe(true);
    act(() => result.current.setCourseQuery("pebble"));
    await waitFor(() => expect(result.current.courseResults).toHaveLength(1));
    act(() => result.current.pickHomeCourse(result.current.courseResults[0]));
    expect(result.current.homeCourseOpen).toBe(false);

    act(() => result.current.openHomeCourse());
    act(() => result.current.setCourseQuery("spy"));
    act(() => result.current.closeHomeCourse());
    expect(result.current.homeCourseOpen).toBe(false);
    expect(result.current.courseQuery).toBe("");
  });

  it("saves the form, keeps device choices, and comes back clean", async () => {
    const { repository, result } = await loaded({ user: { handicap: 12 } });

    act(() => {
      result.current.setHandicapInput("+1.2");
      result.current.pickHomeCourse(pebbleBeachSummary);
      result.current.setGetUpdates(false);
    });
    act(() => result.current.save());

    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(repository.updates).toEqual([{ handicap: -1.2, home_course_id: pebbleBeachSummary.id }]);
    expect(repository.device).toEqual({ getUpdates: false });
    expect(result.current.dirty).toBe(false);
    expect(result.current.handicapInput).toBe("+1.2");
    expect(result.current.homeCourse?.id).toBe(pebbleBeachSummary.id);
  });

  it("clears the handicap and home course when they are emptied", async () => {
    const { repository, result } = await loaded({ user: { handicap: 8, home_course_id: pebbleBeachSummary.id } });

    act(() => {
      result.current.setHandicapInput("");
      result.current.clearHomeCourse();
    });
    act(() => result.current.save());

    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(repository.updates).toEqual([{ handicap: null, home_course_id: null }]);
    expect(result.current.homeCourse).toBeNull();
  });

  it("runs the after-save step only once the save has gone through", async () => {
    const { result } = await loaded();
    const ran: string[] = [];

    act(() => result.current.setHandicapInput("5"));
    act(() => result.current.save(() => ran.push("left")));
    expect(ran).toEqual([]);

    await waitFor(() => expect(ran).toEqual(["left"]));
  });

  it("keeps the edits and device choices when the save fails", async () => {
    const { repository, result } = await loaded({}, (repo) => {
      repo.saveError = new Error("Selected home course was not found");
    });

    act(() => {
      result.current.setHandicapInput("5");
      result.current.setGetUpdates(false);
    });
    act(() => result.current.save());

    await waitFor(() => expect(result.current.saveError).toBe("Selected home course was not found"));
    expect(result.current.dirty).toBe(true);
    expect(result.current.handicapInput).toBe("5");
    expect(repository.device.getUpdates).toBe(true);
  });

  it("discard puts the form back and clears a failed save", async () => {
    const { result } = await loaded({ user: { handicap: 12 } }, (repo) => {
      repo.saveError = new Error("Could not save.");
    });

    act(() => result.current.setHandicapInput("3"));
    act(() => result.current.save());
    await waitFor(() => expect(result.current.saveError).not.toBeNull());

    act(() => result.current.discard());
    await waitFor(() => expect(result.current.saveError).toBeNull());
    expect(result.current.handicapInput).toBe("12");
    expect(result.current.dirty).toBe(false);
  });

  it("puts the saved user in the shared user cache", async () => {
    const { client, result } = await loaded();

    act(() => result.current.setHandicapInput("7.1"));
    act(() => result.current.save());

    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(client.getQueryData<{ handicap: number | null }>(queryKeys.user("user-1"))?.handicap).toBe(7.1);
  });

  it("surfaces a load error and is never dirty without settings", async () => {
    const { result } = await loaded({}, (repo) => {
      repo.loadError = new Error("User not found");
    });

    expect(result.current.loadError).toBe("User not found");
    act(() => result.current.setGetUpdates(false));
    expect(result.current.dirty).toBe(false);
  });
});
