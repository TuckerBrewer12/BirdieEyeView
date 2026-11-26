import { useCallback, useEffect, useState } from "react";
import { useBeforeUnload, useLocation, useNavigate } from "react-router-dom";

export type LeaveDestination = string | number;

export interface LeaveGuard {
  blocked: boolean;
  stay: () => void;
  leave: () => void;
  request: (to: LeaveDestination) => void;
}

/**
 * While `active`, stops the player leaving the page: an in-app link, or a control that calls
 * `request`, waits on `leave` or `stay`, and closing or reloading the tab asks the browser to confirm. The app uses `BrowserRouter`,
 * which has no blocker of its own, so this listens for the link click itself. Browser Back is not
 * caught: the router handles the pop before any listener here could, so stopping it needs the
 * data router's `useBlocker`.
 */
export function useLeaveGuard(active: boolean): LeaveGuard {
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState<LeaveDestination | null>(null);
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useBeforeUnload((event) => {
    if (!active) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    if (!active) return;
    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      if (nextPath === currentPath) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(nextPath);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [active, currentPath]);

  const go = useCallback(
    (to: LeaveDestination) => {
      if (typeof to === "number") void navigate(to);
      else void navigate(to);
    },
    [navigate],
  );

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    setPending(null);
    if (pending !== null) go(pending);
  }, [go, pending]);
  const request = useCallback(
    (to: LeaveDestination) => {
      if (active) setPending(to);
      else go(to);
    },
    [active, go],
  );

  return { blocked: pending !== null, stay, leave, request };
}
