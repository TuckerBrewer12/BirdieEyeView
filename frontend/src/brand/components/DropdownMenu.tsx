import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

/**
 * The desktop menu for picking one: a button with a card of rows opening
 * under it. Rows are 40 tall, against 52 in a mobile `Sheet`; the chosen row
 * is shaded and checked.
 */

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

/** The button that opens the menu. Its border darkens, and the chevron flips, while it is open. */
function DropdownMenuTrigger({ className, children, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      render={<Button variant="outline" size="lg" />}
      className={cn(
        "group bg-card font-semibold hover:border-foreground hover:bg-card aria-expanded:bg-card data-popup-open:border-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown aria-hidden data-icon="inline-end" className="size-3 transition-transform group-data-popup-open:rotate-180" />
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
      className={cn(
        "flex h-10 w-full cursor-default items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-foreground outline-none select-none data-highlighted:bg-muted data-checked:bg-muted data-checked:font-semibold",
        className,
      )}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      {detail != null && (
        <span className="text-body-sm font-normal text-muted-foreground">{detail}</span>
      )}
      <span className="inline-flex w-3.5 justify-end">
        <MenuPrimitive.RadioItemIndicator>
          <Check aria-hidden className="size-3.5 stroke-icon-active text-primary" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
    </MenuPrimitive.RadioItem>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
