import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { FormEvent, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { FakeLoginAuth } from "@/testing/fakes/FakeLoginAuth";
import { useLoginPageViewModel } from "../useLoginPageViewModel";

const submitEvent = { preventDefault: () => {} } as FormEvent;

function renderVm(auth: FakeLoginAuth, state?: { email?: string; flash?: string }) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <Routes>
        <Route path="/login" element={children} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  );
  return renderHook(() => useLoginPageViewModel(auth), { wrapper });
}

const UNVERIFIED = new Error("Email not verified. Please verify your email before signing in.");

describe("useLoginPageViewModel", () => {
  it("sends the typed credentials", async () => {
    const auth = new FakeLoginAuth();
    const { result } = renderVm(auth);

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("secret"));
    act(() => result.current.submit(submitEvent));

    await waitFor(() => expect(auth.logins).toEqual([{ email: "a@b.com", password: "secret" }]));
  });

  it("labels the button while a sign-in is in flight", async () => {
    const auth = new FakeLoginAuth();
    auth.loginError = new Error("Invalid email or password");
    const { result } = renderVm(auth);
    expect(result.current.submitLabel).toBe("Sign In");

    act(() => result.current.submit(submitEvent));
    expect(result.current.submitting).toBe(true);
    expect(result.current.submitLabel).toBe("Signing in…");

    await waitFor(() => expect(result.current.submitting).toBe(false));
  });

  it("surfaces a failed sign-in without offering a resend", async () => {
    const auth = new FakeLoginAuth();
    auth.loginError = new Error("Invalid email or password");
    const { result } = renderVm(auth);

    act(() => result.current.submit(submitEvent));

    await waitFor(() => expect(result.current.error).toBe("Invalid email or password"));
    expect(result.current.canResendVerification).toBe(false);
  });

  it("offers a resend only when the account is unverified", async () => {
    const auth = new FakeLoginAuth();
    auth.loginError = UNVERIFIED;
    const { result } = renderVm(auth);

    act(() => result.current.submit(submitEvent));

    await waitFor(() => expect(result.current.canResendVerification).toBe(true));
  });

  it("resends to the trimmed address and shows the reply", async () => {
    const auth = new FakeLoginAuth();
    const { result } = renderVm(auth);
    act(() => result.current.setEmail("  new@example.com  "));

    act(() => result.current.resendVerification());

    await waitFor(() => expect(result.current.resendMessage).toBe(auth.resendMessage));
    expect(auth.resends).toEqual(["new@example.com"]);
  });

  it("asks for an email before resending to nobody", () => {
    const auth = new FakeLoginAuth();
    const { result } = renderVm(auth);

    act(() => result.current.resendVerification());

    expect(result.current.error).toBe("Enter your email first to resend verification.");
    expect(auth.resends).toEqual([]);
  });

  it("clears an old resend confirmation when a new sign-in fails", async () => {
    const auth = new FakeLoginAuth();
    const { result } = renderVm(auth);
    act(() => result.current.setEmail("new@example.com"));
    act(() => result.current.resendVerification());
    await waitFor(() => expect(result.current.resendMessage).not.toBeNull());

    auth.loginError = new Error("Invalid email or password");
    act(() => result.current.submit(submitEvent));

    await waitFor(() => expect(result.current.error).toBe("Invalid email or password"));
    expect(result.current.resendMessage).toBeNull();
  });

  it("takes its email and message from the page that sent it here", () => {
    const { result } = renderVm(new FakeLoginAuth(), {
      email: "  new@example.com ",
      flash: "Password updated.",
    });

    expect(result.current.email).toBe("new@example.com");
    expect(result.current.flashMessage).toBe("Password updated.");
  });

  it("swaps the password field's type and the reveal label together", () => {
    const { result } = renderVm(new FakeLoginAuth());
    expect(result.current.passwordInputType).toBe("password");
    expect(result.current.revealLabel).toBe("Show password");

    act(() => result.current.togglePasswordRevealed());

    expect(result.current.passwordInputType).toBe("text");
    expect(result.current.revealLabel).toBe("Hide password");
  });
});
