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

const popupClass: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-full max-w-sheet border-l border-border shadow-card data-ending-style:translate-x-full data-starting-style:translate-x-full",
  bottom:
    "inset-x-0 bottom-0 max-h-full w-full overflow-y-auto rounded-t-sheet px-3 pt-2 pb-7 data-ending-style:translate-y-full data-starting-style:translate-y-full",
};

const closeButton: Record<SheetSide, React.ComponentProps<typeof Button>> = {
  right: { variant: "ghost", size: "icon-sm", className: "absolute top-3 right-3" },
  bottom: { variant: "secondary", size: "icon-lg", shape: "pill", className: "absolute top-6 right-4" },
};

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * The portal and dim overlay a sheet opens over. `contained` keeps both inside
 * the nearest positioned parent (the brand preview) instead of over the page.
 * Children position themselves with `absolute` when contained, `fixed` when not.
 */
function SheetPortal({ contained = false, children }: { contained?: boolean; children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const position = contained ? "absolute" : "fixed";

  const portal = (
    <SheetPrimitive.Portal data-slot="sheet-portal" container={contained ? containerRef : undefined}>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className={cn(
          "inset-0 z-50 bg-foreground/recessed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
          position,
        )}
      />
      {children}
    </SheetPrimitive.Portal>
  );

  if (!contained) return portal;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {portal}
    </div>
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
  return (
    <SheetPortal contained={contained}>
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "z-50 flex flex-col bg-card text-card-foreground outline-none transition-transform duration-200 ease-out",
          contained ? "absolute" : "fixed",
          popupClass[side],
          className,
        )}
        {...props}
      >
        <SheetSideContext.Provider value={side}>
          {side === "bottom" && (
            <div
              aria-hidden
              data-slot="sheet-handle"
              className="mb-1.5 h-1 w-9 shrink-0 self-center rounded-full bg-border-strong"
            />
          )}
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close data-slot="sheet-close" render={<Button {...closeButton[side]} />}>
              <X />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetSideContext.Provider>
      </SheetPrimitive.Popup>
    </SheetPortal>
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

/** The rows of a bottom sheet, one of which is chosen. Tab moves between them. */
function SheetOptions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-options"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

/**
 * One row of `SheetOptions`: a button that picks it. The chosen row is
 * pressed, heavier and checked.
 */
function SheetOption({
  selected = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-slot="sheet-option"
      className={cn(
        "flex h-13 w-full items-center rounded-card px-2 text-left text-base text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/half aria-pressed:font-semibold",
        className,
      )}
      {...props}
    >
      <span className="flex-1">{children}</span>
      {selected && <Check aria-hidden className="size-4 stroke-icon-active text-primary" />}
    </button>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetOptions,
  SheetOption,
};
export type { SheetSide };
