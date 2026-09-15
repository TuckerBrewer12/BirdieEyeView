import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { pebbleBeach, searchableCourses } from "@/testing/fixtures/courses";
import {
  FakeRoundsRepository,
  type FakeRoundsRepositorySeed,
} from "@/testing/fakes/FakeRoundsRepository";
import { useCourseSearch } from "../useCourseSearch";

const DEBOUNCE_MS = 300;

function renderSearch(seed: FakeRoundsRepositorySeed = { courses: searchableCourses }) {
  const repository = new FakeRoundsRepository(seed);
  const rendered = renderHook(() => useCourseSearch("user-1", repository));
  return { repository, ...rendered };
}

/** Run the debounce out and let the search promise settle. */
async function advancePastDebounce(ms = DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useCourseSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never searches for a query under two characters", async () => {
    const { result, repository } = renderSearch();
    act(() => result.current.setQuery("p"));
    await advancePastDebounce();

    expect(repository.searchedQueries).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe("p");
  });

  it("clears earlier results when the query drops below two characters", async () => {
    const { result } = renderSearch();
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();
    expect(result.current.results).toHaveLength(1);

    act(() => result.current.setQuery("p"));
    expect(result.current.results).toEqual([]);
  });

  it("dropping below two characters cancels an in-flight search and stops the spinner", async () => {
    const { result } = renderSearch({ courses: searchableCourses, searchDelaysMs: [500] });
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();
    expect(result.current.searching).toBe(true);

    act(() => result.current.setQuery("p"));
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);

    await advancePastDebounce(500);
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("waits the full debounce before searching", async () => {
    const { result, repository } = renderSearch();
    act(() => result.current.setQuery("pebble"));

    await advancePastDebounce(DEBOUNCE_MS - 1);
    expect(repository.searchedQueries).toEqual([]);

    await advancePastDebounce(1);
    expect(repository.searchedQueries).toEqual(["pebble"]);
  });

  it("debounces fast typing into one search for the final query", async () => {
    const { result, repository } = renderSearch();
    act(() => result.current.setQuery("pe"));
    await advancePastDebounce(100);
    act(() => result.current.setQuery("peb"));
    await advancePastDebounce(100);
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();

    expect(repository.searchedQueries).toEqual(["pebble"]);
  });

  it("lands results and stops searching", async () => {
    const { result } = renderSearch();
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();

    expect(result.current.results).toEqual([pebbleBeach]);
    expect(result.current.searching).toBe(false);
  });

  it("does not show a spinner until the debounce elapses", async () => {
    const { result } = renderSearch({ courses: searchableCourses, searchDelaysMs: [50] });
    act(() => result.current.setQuery("pebble"));

    await advancePastDebounce(DEBOUNCE_MS - 1);
    expect(result.current.searching).toBe(false);

    await advancePastDebounce(1);
    expect(result.current.searching).toBe(true);

    await advancePastDebounce(50);
    expect(result.current.searching).toBe(false);
  });

  it("trims the query before searching", async () => {
    const { result, repository } = renderSearch();
    act(() => result.current.setQuery("  pebble  "));
    await advancePastDebounce();

    expect(repository.searchedQueries).toEqual(["pebble"]);
    expect(result.current.results).toEqual([pebbleBeach]);
  });

  it("a failed search leaves results empty and stops searching", async () => {
    const { result } = renderSearch({ courses: searchableCourses, searchError: "offline" });
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();

    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("a slow earlier search cannot overwrite a newer one", async () => {
    // First search takes 500ms, second 10ms, so the first resolves last.
    const { result, repository } = renderSearch({
      courses: searchableCourses,
      searchDelaysMs: [500, 10],
    });

    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();
    expect(repository.searchedQueries).toEqual(["pebble"]);

    act(() => result.current.setQuery("zzzz"));
    await advancePastDebounce();
    await advancePastDebounce(10);

    expect(repository.searchedQueries).toEqual(["pebble", "zzzz"]);
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);

    // The stale "pebble" response now arrives and must be ignored.
    await advancePastDebounce(500);
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("reset clears the query, results and spinner", async () => {
    const { result } = renderSearch();
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();
    expect(result.current.results).toHaveLength(1);

    act(() => result.current.reset());
    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("reset cancels a search that has not fired yet", async () => {
    const { result, repository } = renderSearch();
    act(() => result.current.setQuery("pebble"));
    act(() => result.current.reset());
    await advancePastDebounce();

    expect(repository.searchedQueries).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it("reset discards a search that is already in flight", async () => {
    const { result } = renderSearch({ courses: searchableCourses, searchDelaysMs: [500] });
    act(() => result.current.setQuery("pebble"));
    await advancePastDebounce();
    expect(result.current.searching).toBe(true);

    act(() => result.current.reset());
    await advancePastDebounce(500);

    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("unmounting cancels a search that has not fired yet", async () => {
    const { result, repository, unmount } = renderSearch();
    act(() => result.current.setQuery("pebble"));
    unmount();
    await advancePastDebounce();

    expect(repository.searchedQueries).toEqual([]);
  });
});
