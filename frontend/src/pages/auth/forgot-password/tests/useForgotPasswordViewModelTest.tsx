import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { queryWrapper } from "../../tests/queryWrapper";
import { useForgotPasswordViewModel } from "../useForgotPasswordViewModel";

function renderVm(auth = new FakeAuth()) {
  const view = renderHook(() => useForgotPasswordViewModel(auth), { wrapper: queryWrapper() });
  return { auth, ...view };
}

describe("useForgotPasswordViewModel", () => {
  it("asks for a link to the trimmed address and says one is on its way", async () => {
    const { auth, result } = renderVm(new FakeAuth().hold("forgotPassword"));
    act(() => result.current.setEmail(" sam@example.com "));

    act(() => result.current.submit());
    await waitFor(() => expect(result.current.submitting).toBe(true));
    act(() => auth.release());

    await waitFor(() => expect(result.current.notice).toBe(AUTH_MESSAGES.resetSent));
    expect(auth.resetRequests).toEqual(["sam@example.com"]);
    expect(result.current.error).toBeNull();
  });

  it("shows why a request failed", async () => {
    const { result } = renderVm(new FakeAuth().fail("forgotPassword", "Too many reset attempts."));

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.error).toBe("Too many reset attempts."));
    expect(result.current.notice).toBeNull();
  });
});
