import { useLayoutEffect, useRef, type ReactNode } from "react";

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
