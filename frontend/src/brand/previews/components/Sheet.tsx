import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOption,
  SheetOptions,
  SheetTitle,
} from "@/brand/components/Sheet";

const sortOptions = ["Date", "Score", "To Par", "Course"];

/** The side panel (handicap breakdown, unsaved changes) and the phone's pick-one sheet (sort). */
export default function SheetPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Side panel · right</div>
        <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          <Sheet defaultOpen modal={false}>
            <SheetContent contained initialFocus={false}>
              <SheetHeader>
                <SheetTitle>Handicap Index</SheetTitle>
                <SheetDescription>12.4 HCP</SheetDescription>
              </SheetHeader>
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Body copy sits in the page. The kit only paints the panel.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">
          Bottom sheet · mobile · pick one
        </div>
        <div className="relative h-sheet overflow-hidden rounded-2xl bg-border-strong">
          <Sheet defaultOpen modal={false}>
            <SheetContent side="bottom" contained initialFocus={false}>
              <SheetHeader>
                <SheetTitle>Sort by</SheetTitle>
              </SheetHeader>
              <SheetOptions>
                {sortOptions.map((option) => (
                  <SheetOption key={option} selected={option === "Date"}>
                    {option}
                  </SheetOption>
                ))}
              </SheetOptions>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
