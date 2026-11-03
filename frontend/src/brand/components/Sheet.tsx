import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

/**
 * A drawer with shadcn's slot tree (Trigger / Content / Header / Title /
 * Description / Footer) so pages compose the same way.
 *
 * `side="bottom"` is the mobile sheet for picking one option: a grab handle,
 * a title with a round close button, then `SheetOptions` rows with a check on
 * the chosen one. `side="right"` (the default) is the wide panel the handicap
 * breakdown uses. `contained` lets the brand preview host the panel inside
 * the stage instead of portaling over the page.
 */

type SheetSide = "right" | "bottom";

const SheetSideContext = React.createContext<SheetSide>("right");

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  contained = false,
  ...props
}: SheetPrimitive.Backdrop.Props & { contained?: boolean }) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "z-50 bg-foreground/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        contained ? "absolute inset-0" : "fixed inset-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  contained = false,
  showCloseButton = true,
  side = "right",
  ...props
}: SheetPrimitive.Popup.Props & {
  contained?: boolean;
  showCloseButton?: boolean;
  side?: SheetSide;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const panel = (
    <SheetPrimitive.Portal
      data-slot="sheet-portal"
      container={contained ? containerRef : undefined}
    >
      <SheetOverlay contained={contained} />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "z-50 flex flex-col bg-card text-card-foreground outline-none transition-transform duration-200 ease-out",
          side === "right" &&
            "relative h-full w-full max-w-sheet border-l border-border shadow-card data-ending-style:translate-x-full data-starting-style:translate-x-full",
          side === "right" && (contained ? "absolute inset-y-0 right-0" : "fixed inset-y-0 right-0"),
          side === "bottom" &&
            "max-h-full w-full overflow-y-auto rounded-t-sheet px-3 pt-2 pb-7 data-ending-style:translate-y-full data-starting-style:translate-y-full",
          side === "bottom" && (contained ? "absolute inset-x-0 bottom-0" : "fixed inset-x-0 bottom-0"),
          className,
        )}
        {...props}
      >
        <SheetSideContext.Provider value={side}>
          {side === "bottom" && (
            <div
              aria-hidden
              data-slot="sheet-handle"
              className="mb-1.5 h-1.25 w-9 shrink-0 self-center rounded-full bg-border-strong"
            />
          )}
          {children}
          {showCloseButton && side === "right" && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3"
                />
              }
            >
              <X />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
          {showCloseButton && side === "bottom" && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              aria-label="Close"
              className="absolute top-6 right-4 flex size-9 items-center justify-center rounded-full bg-muted text-secondary-foreground outline-none hover:bg-border focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X aria-hidden className="size-3" />
            </SheetPrimitive.Close>
          )}
        </SheetSideContext.Provider>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );

  if (!contained) return panel;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {panel}
    </div>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  const side = React.useContext(SheetSideContext);
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-0.5",
        side === "right" ? "border-b border-border px-4 py-4 pr-12" : "min-h-12 justify-center pt-1 pr-12 pb-2 pl-2",
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 border-t border-border bg-muted/50 p-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  const side = React.useContext(SheetSideContext);
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-card-foreground",
        side === "right" ? "text-base font-medium" : "text-lg font-bold",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** The rows of a bottom sheet, one of which is chosen. */
function SheetOptions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="radiogroup"
      data-slot="sheet-options"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

/** One row of `SheetOptions`: the chosen one is heavier and carries a check. */
function SheetOption({
  selected = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "role"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="sheet-option"
      className={cn(
        "flex h-13 w-full items-center rounded-card px-2 text-base text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "font-semibold",
        className,
      )}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      <span className="inline-flex w-4 justify-end">
        {selected && <Check aria-hidden className="size-4 text-primary" strokeWidth={2.5} />}
      </span>
    </button>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOptions,
  SheetOption,
};
export type { SheetSide };
