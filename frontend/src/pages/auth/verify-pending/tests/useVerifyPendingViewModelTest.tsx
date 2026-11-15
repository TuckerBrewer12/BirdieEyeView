import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SessionCheck } from "@/pages/auth/authActions";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { queryWrapper } from "../../tests/queryWrapper";
import { useVerifyPendingViewModel, type VerifyPendingArrival } from "../useVerifyPendingViewModel";

const SIGNED_OUT: SessionCheck = { userId: null, emailVerified: false };

function renderVm(
  auth = new FakeAuth(),
  arrival: VerifyPendingArrival = {},
  session: SessionCheck = SIGNED_OUT,
) {
  const verified = new FakeHandler();
  const view = renderHook(
    () => useVerifyPendingViewModel(auth, session, arrival, verified.handle),
    { wrapper: queryWrapper() },
  );
  return { auth, verified, ...view };
}

describe("useVerifyPendingViewModel", () => {
  it("starts with Register's email and message", () => {
    const { result } = renderVm(new FakeAuth(), {
      email: " sam@example.com ",
      flash: AUTH_MESSAGES.registered,
    });

    expect(result.current.email).toBe("sam@example.com");
    expect(result.current.notice).toBe(AUTH_MESSAGES.registered);
  });

  it("mails another link and says so", async () => {
    const { auth, result } = renderVm(new FakeAuth(), { email: "sam@example.com" });

    act(() => result.current.resend());

    await waitFor(() => expect(result.current.notice).toBe(AUTH_MESSAGES.verificationSent));
    expect(auth.resends).toEqual(["sam@example.com"]);
  });

  it("asks for an email before mailing nobody", () => {
    const { auth, result } = renderVm();

    act(() => result.current.resend());

    expect(result.current.error).toBe("Enter your email to resend the verification link.");
    expect(auth.resends).toEqual([]);
  });

  it("shows why a resend failed", async () => {
    const { result } = renderVm(
      new FakeAuth().fail("resendVerification", "Too many verification resend attempts."),
      { email: "sam@example.com" },
    );

    act(() => result.current.resend());

    await waitFor(() => expect(result.current.error).toBe("Too many verification resend attempts."));
  });

  it("moves on once the session comes back verified", async () => {
    const auth = new FakeAuth();
    auth.session = { userId: "user-1", emailVerified: true };
    const { verified } = renderVm(auth);

    await waitFor(() => expect(verified.calls).toHaveLength(1));
  });

  it("keeps waiting while the session is still unverified", async () => {
    const auth = new FakeAuth();
    auth.session = { userId: "user-1", emailVerified: false };
    const { verified } = renderVm(auth);

    await waitFor(() => expect(auth.sessionChecks).toBeGreaterThan(0));
    expect(verified.calls).toHaveLength(0);
  });

  it("moves on straight away when already signed in and verified", () => {
    const { auth, verified } = renderVm(new FakeAuth(), {}, { userId: "user-1", emailVerified: true });

    expect(verified.calls).toHaveLength(1);
    expect(auth.sessionChecks).toBe(0);
  });
});
