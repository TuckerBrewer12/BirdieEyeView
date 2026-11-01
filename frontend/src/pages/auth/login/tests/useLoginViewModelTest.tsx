import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { queryWrapper } from "../../tests/queryWrapper";
import { useLoginViewModel, type LoginArrival } from "../useLoginViewModel";

function renderVm(auth = new FakeAuth(), arrival: LoginArrival = {}) {
  const view = renderHook(() => useLoginViewModel(auth, arrival), { wrapper: queryWrapper() });
  return { auth, ...view };
}

describe("useLoginViewModel", () => {
  it("signs in with the typed credentials and then moves on", async () => {
    const { auth, result } = renderVm();
    const signedIn = new FakeHandler();
    act(() => result.current.setEmail("  sam@example.com "));
    act(() => result.current.setPassword("birdie123"));

    act(() => result.current.submit(signedIn.handle));

    await waitFor(() => expect(signedIn.calls).toHaveLength(1));
    expect(auth.logins).toEqual([{ email: "sam@example.com", password: "birdie123" }]);
  });

  it("is submitting while the sign-in is in flight", async () => {
    const { auth, result } = renderVm(new FakeAuth().hold("login"));
    expect(result.current.submitting).toBe(false);

    act(() => result.current.submit(() => {}));
    await waitFor(() => expect(result.current.submitting).toBe(true));

    act(() => auth.release());
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });

  it("stays put and says why when the password is wrong, with no resend offer", async () => {
    const { result } = renderVm(new FakeAuth().fail("login", AUTH_MESSAGES.badCredentials));
    const signedIn = new FakeHandler();

    act(() => result.current.submit(signedIn.handle));

    await waitFor(() => expect(result.current.error).toBe(AUTH_MESSAGES.badCredentials));
    expect(result.current.canResendVerification).toBe(false);
    expect(signedIn.calls).toHaveLength(0);
  });

  it("offers a fresh link to an unverified account and shows the reply", async () => {
    const { auth, result } = renderVm(new FakeAuth().fail("login", AUTH_MESSAGES.unverified));
    act(() => result.current.setEmail("new@example.com"));
    act(() => result.current.submit(() => {}));
    await waitFor(() => expect(result.current.canResendVerification).toBe(true));

    act(() => result.current.resendVerification());

    await waitFor(() => expect(result.current.notice).toBe(AUTH_MESSAGES.verificationSent));
    expect(auth.resends).toEqual(["new@example.com"]);
  });

  it("asks for an email before resending to nobody", async () => {
    const { auth, result } = renderVm(new FakeAuth().fail("login", AUTH_MESSAGES.unverified));
    act(() => result.current.submit(() => {}));
    await waitFor(() => expect(result.current.canResendVerification).toBe(true));

    act(() => result.current.resendVerification());

    expect(result.current.error).toBe("Enter your email first to resend verification.");
    expect(auth.resends).toEqual([]);
  });

  it("starts from what the last screen handed over, until the next sign-in", async () => {
    const { result } = renderVm(new FakeAuth().fail("login", AUTH_MESSAGES.badCredentials), {
      email: " new@example.com ",
      flash: AUTH_MESSAGES.passwordReset,
    });
    expect(result.current.email).toBe("new@example.com");
    expect(result.current.notice).toBe(AUTH_MESSAGES.passwordReset);

    act(() => result.current.submit(() => {}));

    await waitFor(() => expect(result.current.error).toBe(AUTH_MESSAGES.badCredentials));
    expect(result.current.notice).toBeNull();
  });
});
