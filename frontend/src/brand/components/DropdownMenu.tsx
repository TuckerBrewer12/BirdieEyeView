import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/brand/cn";

/**
 * The desktop menu: a button with a card of rows opening under it. Rows are
 * 40 tall, against 52 in a mobile `Sheet`. `DropdownMenuRadioGroup` picks
 * one (the chosen row is shaded and checked); `DropdownMenuItem` just does
 * something.
 */

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

/** The button that opens the menu. Its border darkens, and the chevron flips, while it is open. */
function DropdownMenuTrigger({ className, children, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(
        "group inline-flex h-9.5 items-center gap-1.5 rounded-card border border-input bg-card px-3 text-body font-semibold text-foreground outline-none select-none hover:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown aria-hidden className="size-3 transition-transform group-data-popup-open:rotate-180" />
    </MenuPrimitive.Trigger>
  );
}

function DropdownMenuContent({
  className,
  align = "start",
  side,
  sideOffset = 8,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "w-65 origin-(--transform-origin) rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-card outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const rowClass =
  "flex h-10 w-full cursor-default items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-foreground outline-none select-none data-highlighted:bg-muted";

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(rowClass, className)}
      {...props}
    />
  );
}

function DropdownMenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

/** A row of `DropdownMenuRadioGroup`. `detail` is the quiet figure at the right, such as a count. */
function DropdownMenuRadioItem({
  className,
  children,
  detail,
  ...props
}: MenuPrimitive.RadioItem.Props & { detail?: ReactNode }) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(rowClass, "data-checked:bg-muted data-checked:font-semibold", className)}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      {detail != null && (
        <span className="text-body-sm font-normal text-muted-foreground">{detail}</span>
      )}
      <span className="inline-flex w-3.5 justify-end">
        <MenuPrimitive.RadioItemIndicator>
          <Check aria-hidden className="size-3.5 text-primary" strokeWidth={2.5} />
        </MenuPrimitive.RadioItemIndicator>
      </span>
    </MenuPrimitive.RadioItem>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
