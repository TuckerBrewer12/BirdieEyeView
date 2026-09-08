import { Loader2, MapPin, X } from "lucide-react";
import { SearchField } from "./SearchField";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./Card";
import type { CourseSummary } from "@/types/golf";

interface CourseLinkSearchProps {
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (q: string) => void;
  onSelectCourse: (course: CourseSummary) => void;
  onClose: () => void;
  title?: string;
  linking?: boolean;
  reviewVariant?: boolean;
  onUseCustomName?: (name: string) => void;
  autoFocus?: boolean;
  linkedName?: string;
  customName?: string;
  onClear?: () => void;
}

export function CourseLinkSearch({
  query,
  results,
  searching,
  onQueryChange,
  onSelectCourse,
  onClose,
  title,
  linking = false,
  reviewVariant = false,
  onUseCustomName,
  autoFocus = true,
  linkedName,
  customName,
  onClear,
}: CourseLinkSearchProps) {
  if (linkedName && onClear) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Linked</CardTitle>
          <CardDescription>{linkedName}</CardDescription>
          <CardAction>
            <ClearButton onClick={onClear} label="Unlink course" />
          </CardAction>
        </CardHeader>
      </Card>
    );
  }

  if (customName && onClear) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{customName}</CardTitle>
          <CardDescription>Saving without a linked course</CardDescription>
          <CardAction>
            <ClearButton onClick={onClear} label="Edit name" />
          </CardAction>
        </CardHeader>
      </Card>
    );
  }

  const showCustomFooter =
    query.trim().length >= 2 && !searching && reviewVariant && !!onUseCustomName;
  const showEmpty =
    query.trim().length >= 2 && !searching && results.length === 0 && !reviewVariant;

  const body = (
    <>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder="Search courses…"
        autoFocus={autoFocus}
        loading={searching}
      />
      {results.length > 0 && (
        <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-lg ring-1 ring-foreground/10">
          {results.map((course) => (
            <li key={course.id}>
              <ResultRow course={course} linking={linking} onSelect={onSelectCourse} />
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <p className="mt-1.5 text-sm text-muted-foreground">No courses found</p>
      )}
    </>
  );

  const footer = showCustomFooter ? (
    <CardFooter className="justify-between gap-2">
      <span className="text-muted-foreground">
        {results.length > 0 ? "Not the right course?" : "No match found"}
      </span>
      <button
        type="button"
        onClick={() => onUseCustomName?.(query.trim())}
        className="shrink-0 font-medium text-primary"
      >
        Save as "{query.trim()}"
      </button>
    </CardFooter>
  ) : null;

  return (
    <Card size={title ? "default" : "sm"}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardAction>
            <ClearButton onClick={onClose} label="Close" />
          </CardAction>
        </CardHeader>
      )}
      <CardContent className={title ? undefined : "pt-0"}>{body}</CardContent>
      {footer}
    </Card>
  );
}

function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex text-muted-foreground hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  );
}

function ResultRow({
  course,
  linking,
  onSelect,
}: {
  course: CourseSummary;
  linking: boolean;
  onSelect: (course: CourseSummary) => void;
}) {
  return (
    <button
      type="button"
      disabled={linking}
      onClick={() => onSelect(course)}
      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted disabled:cursor-default disabled:opacity-50"
    >
      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-[13px] font-semibold text-foreground">{course.name}</div>
        {course.location && (
          <div className="text-xs text-muted-foreground">{course.location}</div>
        )}
      </div>
      {linking && (
        <Loader2 className="ml-auto mt-1 size-3 animate-spin text-muted-foreground" />
      )}
    </button>
  );
}
