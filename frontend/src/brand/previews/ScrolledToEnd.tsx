import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Scrolls the first thing inside it that overflows sideways to its far end. A preview stage
 * is a phone's width, so a wide chart or scorecard scrolls there; this shows the end of it.
 */
export function ScrolledToEnd({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const scroller = [...(ref.current?.querySelectorAll<HTMLElement>("*") ?? [])].find(
      (el) => el.scrollWidth > el.clientWidth,
    );
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, []);
  return <div ref={ref}>{children}</div>;
}
