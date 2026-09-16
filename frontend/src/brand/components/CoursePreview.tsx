import { useState } from "react";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { motion as motionTokens } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import type { CourseSummary } from "@/types/golf";

interface CoursePreviewProps {
  course: CourseSummary;
  onClick?: () => void;
  /** Pin the keyboard focus ring — used by the kit preview. */
  focused?: boolean;
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label} </span>
      <span className="font-semibold text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export function CoursePreview({ course, onClick, focused = false }: CoursePreviewProps) {
  const name = formatCourseName(course.name);
  const [focus, setFocus] = useState(false);
  const showFocus = focused || focus;

  return (
    <motion.div
      data-slot="course-preview"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View ${name} details` : undefined}
      onClick={onClick}
      onFocus={onClick ? () => setFocus(true) : undefined}
      onBlur={onClick ? () => setFocus(false) : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      whileHover={onClick ? { scale: motionTokens.hoverScale } : undefined}
      whileTap={onClick ? { scale: motionTokens.tapScale } : undefined}
      transition={motionTokens.spring}
      className={cn(
        "flex flex-col gap-2 overflow-hidden rounded-card border border-border bg-card p-4 transition-shadow",
        onClick ? "cursor-pointer hover:shadow-card" : "cursor-default",
        onClick && "focus-visible:outline-none",
        showFocus && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <span className="truncate text-base font-bold tracking-name text-foreground">
        {name}
      </span>

      {course.location && (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{course.location}</span>
        </div>
      )}

      <div className="mt-1 flex gap-4">
        <Stat label="Par" value={course.par} />
        <Stat label="Holes" value={course.total_holes} />
        <Stat label="Tees" value={course.tee_count} />
      </div>
    </motion.div>
  );
}
