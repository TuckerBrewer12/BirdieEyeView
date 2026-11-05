import { useCallback, useEffect, useState } from "react";
import { useBeforeUnload, useLocation, useNavigate } from "react-router-dom";

export interface LeaveGuard {
  /** A link off the page was stopped and is waiting on the player. */
  blocked: boolean;
  /** Stays on the page. */
  stay: () => void;
  /** Goes where the player was heading. */
  leave: () => void;
}

/**
 * While `active`, stops the player leaving the page: an in-app link waits on `leave` or `stay`,
 * and closing or reloading the tab asks the browser to confirm. The app uses `BrowserRouter`,
 * which has no blocker of its own, so this listens for the link click itself. Browser Back is not
 * caught: the router handles the pop before any listener here could, so stopping it needs the
 * data router's `useBlocker`.
 */
export function useLeaveGuard(active: boolean): LeaveGuard {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
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
      setPendingPath(nextPath);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [active, currentPath]);

  const stay = useCallback(() => setPendingPath(null), []);
  const leave = useCallback(() => {
    setPendingPath(null);
    if (pendingPath) navigate(pendingPath);
  }, [navigate, pendingPath]);

  return { blocked: pendingPath !== null, stay, leave };
}
