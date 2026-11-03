import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { Card } from "./Card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./InputGroup";
import type { CourseSummary } from "@/domain/course";

interface CourseLinkSearchProps {
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (q: string) => void;
  onSelectCourse: (course: CourseSummary) => void;
  /** Esc, while the search is open. */
  onClose: () => void;
  title?: string;
  /** Sits under the title: what linking gives the round. */
  description?: string;
  linking?: boolean;
  reviewVariant?: boolean;
  onUseCustomName?: (name: string) => void;
  /** Offers "Add a new course" when nothing saved matches. */
  onAddCourse?: () => void;
  autoFocus?: boolean;
  linkedName?: string;
  /** Where the picked course is, shown under its name. */
  linkedLocation?: string;
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
  description,
  linking = false,
  reviewVariant = false,
  onUseCustomName,
  onAddCourse,
  autoFocus = true,
  linkedName,
  linkedLocation,
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
        icon={<LinkedMark />}
        name={linkedName}
        detail={[linkedTitle, linkedLocation].filter(Boolean).join(" · ")}
        actionLabel={clearLabel}
        onAction={onClear}
      />
    );
  }

  if (customName && onClear) {
    return (
      <StatusRow
        icon={<PencilMark />}
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
    } else if (event.key === "Enter" && results[active] && !linking) {
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
            <div>
              <div className="text-sm font-semibold">{title}</div>
              {description && (
                <div className="mt-0.5 text-body-sm text-muted-foreground">{description}</div>
              )}
            </div>
          )}
          <InputGroup className="h-10 rounded-card bg-card">
            <InputGroupInput
              id={inputId}
              type="text"
              role="combobox"
              aria-label="Search courses"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
              placeholder="Search courses…"
              value={query}
              onChange={(e) => {
                setActiveIndex(0);
                onQueryChange(e.target.value);
              }}
              onKeyDown={onKeyDown}
              autoFocus={autoFocus}
              className="pl-0 text-foreground"
            />
            <InputGroupAddon className="pl-3 text-foreground">
              <Search />
            </InputGroupAddon>
            {searching && (
              <InputGroupAddon align="inline-end">
                <Loader2 className="animate-spin text-muted-foreground" />
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {results.length > 0 && (
          <div
            id={listId}
            role="listbox"
            aria-label="Matching courses"
            className="border-t border-chart-grid p-1.5"
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
          <div className="flex items-center justify-between gap-2 border-t border-chart-grid py-1.5 pr-1.5 pl-3.5 text-body-sm text-muted-foreground">
            <span>Not the right course?</span>
            <SaveAsButton name={trimmed} onUseCustomName={onUseCustomName} />
          </div>
        )}

        {results.length > 0 && (
          <div className="flex justify-between border-t border-chart-grid px-3.5 py-2 text-label text-muted-foreground">
            <span>↑ ↓ to move · Enter to link</span>
            <span>Esc to close</span>
          </div>
        )}
      </Card>

      {noMatch && (
        <Card className="gap-2.5 p-3.5">
          <div className="text-body text-foreground-secondary">
            No saved courses match{" "}
            <b className="font-semibold text-foreground">“{trimmed}”</b>.
          </div>
          {(offerName || onAddCourse) && (
            <div className="flex gap-2">
              {offerName && (
                <SaveAsButton name={trimmed} onUseCustomName={onUseCustomName} outlined />
              )}
              {onAddCourse && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="px-3 text-body font-semibold text-primary hover:text-primary"
                  onClick={onAddCourse}
                >
                  Add a new course
                </Button>
              )}
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
    <Button
      variant={outlined ? "outline" : "ghost"}
      size={outlined ? "lg" : "default"}
      className={cn(
        "text-body font-semibold",
        outlined
          ? "border-input bg-card px-3 text-foreground"
          : "shrink-0 text-primary hover:text-primary",
      )}
      onClick={() => onUseCustomName?.(name)}
    >
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
      <Button
        variant="ghost"
        className="shrink-0 px-2.5 text-body font-semibold text-primary hover:text-primary"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </Card>
  );
}

function LinkedMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-primary">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path
        d="M4.8 8.2 L7 10.3 L11.2 5.9"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

function PencilMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      strokeWidth="1.4"
      strokeLinejoin="round"
      className="size-4 shrink-0 stroke-foreground-secondary"
    >
      <path d="M3 13 L3.6 10.4 L10.6 3.4 a1.4 1.4 0 0 1 2 2 L5.6 12.4 Z" />
    </svg>
  );
}

function FlagMark() {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      fill="none"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      className="size-3.5 stroke-current"
    >
      <path d="M4 13V1.5 L11 4 L4 6.5" />
    </svg>
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
  const name = course.name ?? "Unnamed course";
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
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-input bg-card text-primary"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <FlagMark />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          <Highlight text={name} query={nameHit ? query : ""} />
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
        active && <span className="text-label font-semibold text-primary">Enter ↵</span>
      )}
    </button>
  );
}
