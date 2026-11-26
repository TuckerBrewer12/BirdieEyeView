import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useLeaveGuard } from "../useLeaveGuard";

function renderGuard(active: boolean, entries = ["/rounds", "/rounds/round-1"]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    ({ on }: { on: boolean }) => ({ guard: useLeaveGuard(on), path: useLocation().pathname }),
    { wrapper, initialProps: { on: active } },
  );
}

function clickLinkWithoutJsdomNavigating(href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.addEventListener("click", (event) => event.preventDefault());
  document.body.append(link);
  act(() => link.click());
  link.remove();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useLeaveGuard", () => {
  it("goes straight there when nothing is guarded", () => {
    const { result } = renderGuard(false);
    act(() => result.current.guard.request(-1));
    expect(result.current.guard.blocked).toBe(false);
    expect(result.current.path).toBe("/rounds");
  });

  it("holds a requested step back until the player leaves", () => {
    const { result } = renderGuard(true);
    act(() => result.current.guard.request(-1));
    expect(result.current.guard.blocked).toBe(true);
    expect(result.current.path).toBe("/rounds/round-1");

    act(() => result.current.guard.leave());
    expect(result.current.guard.blocked).toBe(false);
    expect(result.current.path).toBe("/rounds");
  });

  it("holds a requested path, and staying keeps the page", () => {
    const { result } = renderGuard(true);
    act(() => result.current.guard.request("/"));
    expect(result.current.guard.blocked).toBe(true);

    act(() => result.current.guard.stay());
    expect(result.current.guard.blocked).toBe(false);
    expect(result.current.path).toBe("/rounds/round-1");
  });

  it("stops an in-app link while guarded, then follows it on leave", () => {
    const { result } = renderGuard(true);
    clickLinkWithoutJsdomNavigating("/analytics");
    expect(result.current.guard.blocked).toBe(true);
    expect(result.current.path).toBe("/rounds/round-1");

    act(() => result.current.guard.leave());
    expect(result.current.path).toBe("/analytics");
  });

  it("lets a link through once the guard is off", () => {
    const { result, rerender } = renderGuard(true);
    rerender({ on: false });
    clickLinkWithoutJsdomNavigating("/analytics");
    expect(result.current.guard.blocked).toBe(false);
  });
});
