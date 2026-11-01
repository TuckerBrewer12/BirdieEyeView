import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { pebbleBeach } from "@/testing/fixtures/courses";
import { queryWrapper } from "../../tests/queryWrapper";
import { useRegisterViewModel } from "../useRegisterViewModel";

function renderVm(auth = new FakeAuth()) {
  const courses = new FakeCoursesRepository([pebbleBeach]);
  const view = renderHook(() => useRegisterViewModel(auth, courses), { wrapper: queryWrapper() });
  return { auth, courses, ...view };
}

type Vm = ReturnType<typeof useRegisterViewModel>;

function fillIn(result: { current: Vm }, password = "birdie123", confirm = password) {
  act(() => result.current.setName(" Sam Snead "));
  act(() => result.current.setEmail(" sam@example.com "));
  act(() => result.current.setPassword(password));
  act(() => result.current.setConfirm(confirm));
}

describe("useRegisterViewModel", () => {
  it("creates the account with a plus handicap and the picked home course", async () => {
    const { auth, result } = renderVm();
    const registered = new FakeHandler<[string, string]>();
    fillIn(result);
    act(() => result.current.setHandicap("+2.5"));
    act(() => result.current.setCourseQuery("Pebble"));
    await waitFor(() => expect(result.current.courseResults).toHaveLength(1));
    act(() => result.current.pickHomeCourse(result.current.courseResults[0]));
    expect(result.current.homeCourse).toEqual({ id: pebbleBeach.id, name: pebbleBeach.name });

    act(() => result.current.submit(registered.handle));

    await waitFor(() => expect(registered.calls).toEqual([["sam@example.com", AUTH_MESSAGES.registered]]));
    expect(auth.registrations).toEqual([
      {
        name: "Sam Snead",
        email: "sam@example.com",
        password: "birdie123",
        handicap: -2.5,
        homeCourseId: pebbleBeach.id,
      },
    ]);
  });

  it("sends no handicap or course when they are left blank", async () => {
    const { auth, result } = renderVm();
    fillIn(result);

    act(() => result.current.submit(() => {}));

    await waitFor(() => expect(auth.registrations).toHaveLength(1));
    expect(auth.registrations[0]).toMatchObject({ handicap: null, homeCourseId: null });
  });

  it("holds the form back with a message on each field that can't be sent", () => {
    const { auth, result } = renderVm();
    fillIn(result, "short", "shorter");
    act(() => result.current.setHandicap("62"));

    act(() => result.current.submit(() => {}));

    expect(result.current.fieldErrors).toEqual({
      password: "Password must be at least 8 characters.",
      confirm: "Passwords do not match.",
      handicap: "Handicap must be between +10 and 54.",
    });
    expect(auth.registrations).toEqual([]);

    act(() => result.current.setHandicap("18"));
    expect(result.current.fieldErrors.handicap).toBeNull();
    expect(result.current.fieldErrors.password).not.toBeNull();
  });

  it("shows the server's refusal", async () => {
    const { result } = renderVm(new FakeAuth().fail("register", AUTH_MESSAGES.emailTaken));
    const registered = new FakeHandler<[string, string]>();
    fillIn(result);

    act(() => result.current.submit(registered.handle));

    await waitFor(() => expect(result.current.error).toBe(AUTH_MESSAGES.emailTaken));
    expect(registered.calls).toHaveLength(0);
  });

  it("drops the home course when it is cleared", async () => {
    const { result } = renderVm();
    act(() => result.current.setCourseQuery("Pebble"));
    await waitFor(() => expect(result.current.courseResults).toHaveLength(1));
    act(() => result.current.pickHomeCourse(result.current.courseResults[0]));

    act(() => result.current.clearHomeCourse());

    expect(result.current.homeCourse).toBeNull();
  });
});
