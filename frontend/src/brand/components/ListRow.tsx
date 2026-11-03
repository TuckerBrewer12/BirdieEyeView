import type { ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/brand/cn";
import type { RenderLink } from "@/brand/nav";

/** Where a row goes when it is tapped. Give at most one; a row with neither is not a target. */
interface RowTarget {
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button. */
  onClick?: () => void;
  /** Turns `href` into the element the app's router needs. Unset, a plain anchor. */
  renderLink?: RenderLink;
}

const plainAnchor: RenderLink = (href) => <a href={href} />;

/**
 * The shell of a list row: 64 tall, a chart-grid rule above every row but the
 * first, and the whole row the tap target when it has somewhere to go. Built
 * to sit in a `Collection layout="rows"` inside a card that clips its corners.
 */
function ListRow({
  slot,
  className,
  href,
  onClick,
  renderLink = plainAnchor,
  children,
}: RowTarget & { slot: string; className?: string; children: ReactNode }) {
  const base =
    "flex min-h-16 w-full items-center gap-3 border-t border-chart-grid py-0 pr-3 pl-4 text-left first:border-t-0";
  const interactive =
    "cursor-pointer outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50";

  const element = href != null ? renderLink(href) : onClick != null ? <button type="button" /> : <div />;
  const tappable = href != null || onClick != null;

  return useRender({
    render: element,
    props: {
      "data-slot": slot,
      className: cn(base, tappable && interactive, className),
      onClick,
      children,
    },
  });
}

export { ListRow };
export type { RowTarget };
