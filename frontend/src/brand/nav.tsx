import type { ComponentType, MouseEventHandler, ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active?: boolean;
}

type RenderLink = (href: string) => useRender.RenderProp;

const plainAnchor: RenderLink = (href) => ({ children, ...props }) => (
  <a href={href} {...props}>
    {children}
  </a>
);

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
