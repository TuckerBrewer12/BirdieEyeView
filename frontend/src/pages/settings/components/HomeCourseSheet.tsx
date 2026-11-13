import {
  CourseLinkSearch,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/brand";
import { useFromBreakpoint } from "@/brand/useFromBreakpoint";
import { courseLabel, type CourseSummary } from "@/domain/course";
import type { HomeCourse } from "../model";

interface HomeCourseSheetProps {
  open: boolean;
  onClose: () => void;
  /** The picked course; null shows the search. */
  homeCourse: HomeCourse | null;
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (query: string) => void;
  onPick: (course: CourseSummary) => void;
  onClear: () => void;
  /** Hosts the sheet in its parent instead of over the page, for the preview. */
  contained?: boolean;
}

/** Picks the home course from a search, or removes it: a panel on a computer, a sheet on a phone. */
export function HomeCourseSheet({
  open,
  onClose,
  homeCourse,
  query,
  results,
  searching,
  onQueryChange,
  onPick,
  onClear,
  contained = false,
}: HomeCourseSheetProps) {
  const wide = useFromBreakpoint("md");
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      modal={!contained}
    >
      <SheetContent side={wide ? "right" : "bottom"} contained={contained} initialFocus={contained ? false : undefined}>
        <SheetHeader>
          <SheetTitle>Home course</SheetTitle>
          <SheetDescription>Your home-course records in analytics come from this course.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <CourseLinkSearch
            query={query}
            results={results}
            searching={searching}
            onQueryChange={onQueryChange}
            onSelectCourse={onPick}
            onClose={onClear}
            linkedTitle="Selected"
            linkedName={homeCourse ? courseLabel(homeCourse.name) : undefined}
            onClear={onClear}
            clearLabel="Remove home course"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
