import type { ComponentProps } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

function DropdownMenuTrigger({
  className,
  children,
  variant = "outline",
  size = "default",
  chevron = true,
  ...props
}: MenuPrimitive.Trigger.Props &
  Pick<ComponentProps<typeof Button>, "variant" | "size"> & {
    chevron?: boolean;
  }) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      render={<Button variant={variant} size={size} />}
      className={cn("group", className)}
      {...props}
    >
      {children}
      {chevron && (
        <ChevronDown aria-hidden data-icon="inline-end" className="size-3 transition-transform group-data-popup-open:rotate-180" />
      )}
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

function DropdownMenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
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
      <MenuPrimitive.RadioItemIndicator>
        <Check aria-hidden className="size-3.5 stroke-icon-active text-primary" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: MenuPrimitive.Item.Props & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex h-10 w-full cursor-default items-center gap-2 rounded-lg px-2.5 text-sm font-medium outline-none select-none data-highlighted:bg-muted [&_svg]:size-4",
        destructive ? "text-destructive" : "text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
