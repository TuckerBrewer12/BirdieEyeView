import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOption,
  SheetOptions,
  SheetTitle,
} from "@/brand/components/Sheet";

const sortOptions = ["Date", "Score", "To par", "Course"];

export default function SheetPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-label font-semibold text-muted-foreground">
        Bottom sheet · mobile · pick one
      </div>
      <div className="relative h-sheet overflow-hidden rounded-2xl bg-border-strong">
        <Sheet defaultOpen modal={false}>
          <SheetContent side="bottom" contained initialFocus={false} aria-label="Sort by">
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
  );
}
