import { StrictMode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, FakeAuth } from "@/testing/fakes/FakeAuth";
import { queryWrapper } from "../../tests/queryWrapper";
import { useVerifyEmailViewModel } from "../useVerifyEmailViewModel";

function renderVm(token: string, auth = new FakeAuth()) {
  const Queries = queryWrapper();
  const view = renderHook(() => useVerifyEmailViewModel(auth, token), {
    wrapper: ({ children }) => (
      <StrictMode>
        <Queries>{children}</Queries>
      </StrictMode>
    ),
  });
  return { auth, ...view };
}

describe("useVerifyEmailViewModel", () => {
  it("spends the token once on arrival, even mounted twice, and reports it verified", async () => {
    const { auth, result } = renderVm("verify-token");
    expect(result.current.status).toBe("verifying");

    await waitFor(() => expect(result.current.status).toBe("verified"));
    expect(result.current.message).toBe(AUTH_MESSAGES.verified);
    expect(auth.verifiedTokens).toEqual(["verify-token"]);
  });

  it("reports an expired link", async () => {
    const { result } = renderVm("old-token", new FakeAuth().fail("verifyEmail", AUTH_MESSAGES.badVerifyToken));

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.message).toBe(AUTH_MESSAGES.badVerifyToken);
  });

  it("sends nothing when the link had no token", () => {
    const { auth, result } = renderVm("  ");

    expect(result.current.status).toBe("missing");
    expect(auth.verifiedTokens).toEqual([]);
  });
});
