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
  homeCourse: HomeCourse | null;
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (query: string) => void;
  onPick: (course: CourseSummary) => void;
  onClear: () => void;
  contained?: boolean;
}

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
            onClose={onClose}
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
