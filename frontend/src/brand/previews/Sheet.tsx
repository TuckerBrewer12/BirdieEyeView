import { Button } from "@/brand/components/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/brand/components/Sheet";

export default function SheetPreview() {
  return (
    <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
      <Sheet defaultOpen modal={false}>
        <div className="p-4">
          <SheetTrigger render={<Button variant="outline" />}>Open</SheetTrigger>
        </div>
        <SheetContent contained initialFocus={false} className="max-w-chart">
          <SheetHeader>
            <SheetTitle>Handicap Index</SheetTitle>
            <SheetDescription>12.4 HCP</SheetDescription>
          </SheetHeader>
          <p className="px-4 py-4 text-sm text-muted-foreground">
            Body copy sits in the page. The kit only paints the panel.
          </p>
          <SheetFooter>
            <Button variant="outline" size="sm">
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
