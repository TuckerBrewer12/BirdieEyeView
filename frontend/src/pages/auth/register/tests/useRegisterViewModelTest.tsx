import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { queryWrapper } from "../../tests/queryWrapper";
import { useRegisterViewModel } from "../useRegisterViewModel";

function renderVm(auth = new FakeAuth()) {
  const view = renderHook(() => useRegisterViewModel(auth), { wrapper: queryWrapper() });
  return { auth, ...view };
}

type Vm = ReturnType<typeof useRegisterViewModel>;

function fillIn(result: { current: Vm }, password = "birdie123", confirm = password) {
  act(() => result.current.setName(" Sam Snead "));
  act(() => result.current.setEmail(" sam@example.com "));
  act(() => result.current.setPassword(password));
  act(() => result.current.setConfirm(confirm));
}

describe("useRegisterViewModel", () => {
  it("creates the account with the name, email and password, trimmed", async () => {
    const { auth, result } = renderVm();
    const registered = new FakeHandler<[string, string]>();
    fillIn(result);

    act(() => result.current.submit(registered.handle));

    await waitFor(() => expect(registered.calls).toEqual([["sam@example.com", AUTH_MESSAGES.registered]]));
    expect(auth.registrations).toEqual([{ name: "Sam Snead", email: "sam@example.com", password: "birdie123" }]);
  });

  it("holds back a short or unmatched password, each field with its message, cleared as it's edited", () => {
    const { auth, result } = renderVm();
    fillIn(result, "short", "shorter");

    act(() => result.current.submit(() => {}));

    expect(result.current.fieldErrors).toEqual({
      password: "Password must be at least 8 characters.",
      confirm: "Passwords do not match.",
    });
    expect(auth.registrations).toEqual([]);

    act(() => result.current.setConfirm("short"));
    expect(result.current.fieldErrors.confirm).toBeNull();
    expect(result.current.fieldErrors.password).not.toBeNull();
    act(() => result.current.setPassword("shorter1"));
    expect(result.current.fieldErrors.password).toBeNull();
  });

  it("shows the server's refusal", async () => {
    const { result } = renderVm(new FakeAuth().fail("register", AUTH_MESSAGES.emailTaken));
    const registered = new FakeHandler<[string, string]>();
    fillIn(result);

    act(() => result.current.submit(registered.handle));

    await waitFor(() => expect(result.current.error).toBe(AUTH_MESSAGES.emailTaken));
    expect(registered.calls).toHaveLength(0);
  });
});
