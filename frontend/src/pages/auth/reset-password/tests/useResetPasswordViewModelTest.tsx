import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { queryWrapper } from "../../tests/queryWrapper";
import { useResetPasswordViewModel } from "../useResetPasswordViewModel";

function renderVm(token: string, auth = new FakeAuth()) {
  const view = renderHook(() => useResetPasswordViewModel(auth, token), { wrapper: queryWrapper() });
  return { auth, ...view };
}

describe("useResetPasswordViewModel", () => {
  it("sets the new password with the link's token, then is done", async () => {
    const { auth, result } = renderVm(" reset-token ");
    act(() => result.current.setPassword("birdie123"));
    act(() => result.current.setConfirm("birdie123"));

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(auth.resets).toEqual([{ token: "reset-token", password: "birdie123" }]);
    expect(result.current.notice).toBe(AUTH_MESSAGES.passwordReset);
    expect(result.current.canSubmit).toBe(false);
  });

  it("names each field's problem and sends nothing", () => {
    const { auth, result } = renderVm("reset-token");
    act(() => result.current.setPassword("short"));
    act(() => result.current.setConfirm("other"));

    act(() => result.current.submit());

    expect(result.current.fieldErrors).toEqual({
      password: "Password must be at least 8 characters.",
      confirm: "Passwords do not match.",
    });
    expect(auth.resets).toEqual([]);
  });

  it("says so up front when the link had no token", () => {
    const { result } = renderVm("");

    expect(result.current.tokenMissing).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.canSubmit).toBe(false);
  });

  it("shows the server's refusal of an expired link", async () => {
    const { result } = renderVm("old-token", new FakeAuth().fail("resetPassword", AUTH_MESSAGES.badResetToken));
    act(() => result.current.setPassword("birdie123"));
    act(() => result.current.setConfirm("birdie123"));

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.error).toBe(AUTH_MESSAGES.badResetToken));
    expect(result.current.done).toBe(false);
  });
});
