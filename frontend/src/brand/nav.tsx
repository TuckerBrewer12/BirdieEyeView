import type { ComponentType, MouseEventHandler, ReactElement, ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";

/**
 * One destination in the app's navigation. The caller decides which one is
 * `active` — the kit never reads the route.
 */
interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active?: boolean;
  /** A count to show beside the label, such as unread requests. Zero or unset shows nothing. */
  badge?: number;
}

/**
 * Turns an href into the element a nav link renders as — `<Link to={href} />`
 * for the app's router. Unset, links are plain anchors.
 */
type RenderLink = (href: string) => ReactElement;

const plainAnchor: RenderLink = (href) => <a href={href} />;

/**
 * A nav link in whatever element the caller's router needs. It stays a link
 * (not a button) so assistive tech reads it as navigation, and carries
 * `aria-current="page"` plus `data-active` when it is the current page.
 */
function NavLink({
  item,
  renderLink = plainAnchor,
  className,
  onClick,
  children,
}: {
  item: NavItem;
  renderLink?: RenderLink;
  className?: string;
  onClick?: MouseEventHandler;
  children: ReactNode;
}) {
  return useRender({
    render: renderLink(item.href),
    props: {
      className,
      onClick,
      children,
      "aria-current": item.active ? "page" : undefined,
      "data-active": item.active ? "" : undefined,
    },
  });
}

export { NavLink };
export type { NavItem, RenderLink };
