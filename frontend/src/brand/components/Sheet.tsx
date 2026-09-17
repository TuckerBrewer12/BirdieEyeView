import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

/**
 * A right-side drawer with shadcn's slot tree (Trigger / Content / Header /
 * Title / Description / Footer) so pages compose the same way.
 *
 * The chrome is ours, not a paste: card tokens, a dim overlay, one edge
 * (right — that is the handicap breakdown), and `contained` so the brand
 * preview can host the panel inside the stage instead of portaling over
 * the page.
 */

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
  ...props
}: SheetPrimitive.Popup.Props & {
  contained?: boolean;
  showCloseButton?: boolean;
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
        className={cn(
          "relative z-50 flex h-full w-full max-w-sheet flex-col border-l border-border bg-card text-card-foreground shadow-card outline-none transition-transform duration-200 ease-out data-ending-style:translate-x-full data-starting-style:translate-x-full",
          contained ? "absolute inset-y-0 right-0" : "fixed inset-y-0 right-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
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
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-0.5 border-b border-border px-4 py-4 pr-12",
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
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-medium text-card-foreground", className)}
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

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
