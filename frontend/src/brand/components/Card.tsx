import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/brand/cn";

const CARD_CORNER = {
  default: "rounded-surface",
  /** The card a page leads with, a step rounder than the cards under it. */
  lead: "rounded-lead",
  "lead-phone": "rounded-lead-phone",
} as const;

/**
 * The kit's card: a borderless surface resting on the page. `size` sets its inner spacing (`lg` for
 * a dashboard's figure cards). `render` makes the whole card another element: a router link
 * (`render={<Link to="…" />}`), a button, or a `<section>`. `interactive` is for a card the golfer
 * presses, which lifts on hover; a section stays put. `surface="none"` keeps the card's layout and
 * spacing but drops its surface, for a card's content set inside something that is already one,
 * like a sheet.
 */
function Card({
  className,
  size = "default",
  corner = "default",
  render,
  interactive = false,
  surface = "raised",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg";
  corner?: keyof typeof CARD_CORNER;
  render?: useRender.RenderProp;
  interactive?: boolean;
  surface?: "raised" | "none";
}) {
  return useRender({
    render: render ?? <div />,
    props: {
      // A caller's data-slot names the card for its page's tests and styles.
      "data-slot": "card",
      "data-size": size,
      ...props,
      className: cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden bg-card py-(--card-spacing) text-sm text-card-foreground shadow-surface [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=lg]:[--card-spacing:--spacing(5)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-surface *:[img:last-child]:rounded-b-surface",
        CARD_CORNER[corner],
        surface === "none" && "rounded-none bg-transparent shadow-none",
        interactive && "cursor-pointer transition-shadow hover:shadow-card",
        className,
      ),
    },
  });
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-surface px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

/** A card's title. `level` makes it a heading, for a card that heads a section of the page. */
function CardTitle({
  className,
  level,
  ...props
}: React.ComponentProps<"div"> & { level?: 2 | 3 }) {
  const Title = level === 2 ? "h2" : level === 3 ? "h3" : "div";
  return (
    <Title
      data-slot="card-title"
      className={cn("text-base leading-snug font-medium group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * A control or figure at the header's end. With `wrap`, a narrow header (under 24rem) drops it
 * under the title, start-aligned, rather than squeezing the title: a menu and a switch together.
 */
function CardAction({ className, wrap = false, ...props }: React.ComponentProps<"div"> & { wrap?: boolean }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        wrap &&
          "@max-sm/card-header:col-start-1 @max-sm/card-header:row-span-1 @max-sm/card-header:row-start-auto @max-sm/card-header:justify-self-start @max-sm/card-header:mt-2",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-surface border-t border-border bg-muted/half p-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
