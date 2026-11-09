import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { CircleCheck, CornerDownLeft, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { Card } from "./Card";
import { SearchField } from "./SearchField";
import { formatCourseName, type CourseSummary } from "@/domain/course";

interface CourseLinkSearchProps {
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (q: string) => void;
  onSelectCourse: (course: CourseSummary) => void;
  /** Esc, while the search is open. */
  onClose: () => void;
  title?: string;
  linking?: boolean;
  reviewVariant?: boolean;
  onUseCustomName?: (name: string) => void;
  /** Puts the caret in the search when it appears: only where the golfer just opened it. */
  focusOnOpen?: boolean;
  linkedName?: string;
  /** Heads the picked course's line: "Linked" or "Selected". */
  linkedTitle?: string;
  customName?: string;
  onClear?: () => void;
  /** The picked course's button. */
  clearLabel?: string;
  /** The search input's id, so a FieldLabel outside can name it. */
  inputId?: string;
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
  focusOnOpen = false,
  linkedName,
  linkedTitle = "Linked",
  customName,
  onClear,
  clearLabel = "Change",
  inputId,
}: CourseLinkSearchProps) {
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  if (linkedName && onClear) {
    return (
      <StatusRow
        icon={<CircleCheck className="size-4 shrink-0 fill-primary stroke-primary-foreground" />}
        name={linkedName}
        detail={linkedTitle}
        actionLabel={clearLabel}
        onAction={onClear}
      />
    );
  }

  if (customName && onClear) {
    return (
      <StatusRow
        icon={<Pencil className="size-4 shrink-0 text-foreground-secondary" />}
        name={customName}
        detail="Custom name · not linked to a course"
        actionLabel="Link course"
        onAction={onClear}
      />
    );
  }

  const trimmed = query.trim();
  const settled = trimmed.length >= 2 && !searching;
  const active = Math.min(activeIndex, results.length - 1);
  const noMatch = settled && results.length === 0;
  const offerName = reviewVariant && !!onUseCustomName;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      onClose();
    } else if (results.length > 0 && event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((active + 1) % results.length);
    } else if (results.length > 0 && event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((active - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && active >= 0 && !linking) {
      event.preventDefault();
      onSelectCourse(results[active]);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Card
        className={cn("gap-0 p-0 text-foreground", results.length > 0 && "shadow-card")}
      >
        <div className="flex flex-col gap-2.5 px-3.5 pt-3.5 pb-2.5">
          {title && (
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm font-semibold">{title}</div>
              {/* Esc closes it from a keyboard; a phone has no Esc. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={onClose}
                className="-mt-1 -mr-1"
              >
                <X />
              </Button>
            </div>
          )}
          <SearchField
            id={inputId}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            placeholder="Search courses…"
            value={query}
            onChange={(q) => {
              setActiveIndex(0);
              onQueryChange(q);
            }}
            onKeyDown={onKeyDown}
            focusOnOpen={focusOnOpen}
            loading={searching}
          />
        </div>

        {results.length > 0 && (
          <div
            id={listId}
            role="listbox"
            aria-label="Matching courses"
            className="border-t border-border p-1.5"
          >
            {results.map((course, index) => (
              <ResultRow
                key={course.id}
                id={`${listId}-${index}`}
                course={course}
                query={trimmed}
                active={index === active}
                linking={linking}
                onHover={() => setActiveIndex(index)}
                onSelect={onSelectCourse}
              />
            ))}
          </div>
        )}

        {results.length > 0 && settled && offerName && (
          <div className="flex items-center justify-between gap-2 border-t border-border py-1.5 pr-1.5 pl-3.5 text-body-sm text-muted-foreground">
            <span>Not the right course?</span>
            <SaveAsButton name={trimmed} onUseCustomName={onUseCustomName} />
          </div>
        )}

      </Card>

      {noMatch && (
        <Card className="gap-2.5 p-3.5">
          <div className="text-body text-foreground-secondary">
            No saved courses match{" "}
            <b className="font-semibold text-foreground">“{trimmed}”</b>.
          </div>
          {offerName && (
            <div>
              <SaveAsButton name={trimmed} onUseCustomName={onUseCustomName} outlined />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SaveAsButton({
  name,
  onUseCustomName,
  outlined = false,
}: {
  name: string;
  onUseCustomName: ((name: string) => void) | undefined;
  outlined?: boolean;
}) {
  return (
    <Button variant={outlined ? "outline" : "link"} onClick={() => onUseCustomName?.(name)}>
      Save as “{name}”
    </Button>
  );
}

function StatusRow({
  icon,
  name,
  detail,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  name: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="flex-row items-center gap-2.5 py-2.5 pr-2.5 pl-3.5">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold text-foreground">{name}</div>
        <div className="text-body-sm text-muted-foreground">{detail}</div>
      </div>
      <Button variant="link" className="shrink-0" onClick={onAction}>
        {actionLabel}
      </Button>
    </Card>
  );
}

/** Bolds the first stretch of `text` that the search typed. */
function Highlight({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <b className={cn("font-bold", className)}>{text.slice(at, at + query.length)}</b>
      {text.slice(at + query.length)}
    </>
  );
}

function ResultRow({
  id,
  course,
  query,
  active,
  linking,
  onHover,
  onSelect,
}: {
  id: string;
  course: CourseSummary;
  query: string;
  active: boolean;
  linking: boolean;
  onHover: () => void;
  onSelect: (course: CourseSummary) => void;
}) {
  const name = formatCourseName(course.name);
  const nameHit = !!query && name.toLowerCase().includes(query.toLowerCase());
  const detail = [course.location, course.par != null ? `Par ${course.par}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      data-slot="course-result"
      disabled={linking}
      onMouseEnter={onHover}
      onClick={() => onSelect(course)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left disabled:cursor-default disabled:opacity-50",
        active && "bg-muted",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          <Highlight text={name} query={query} />
        </span>
        <span className="block text-body-sm text-muted-foreground">
          <Highlight
            text={detail}
            query={nameHit ? "" : query}
            className="text-foreground-secondary"
          />
        </span>
      </span>
      {linking && active ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      ) : (
        active && (
          // The key that links it, shown on the row the arrow keys are on.
          <span aria-hidden className="flex items-center gap-1 text-label font-semibold text-foreground-secondary">
            Enter
            <CornerDownLeft className="size-3" />
          </span>
        )
      )}
    </button>
  );
}
