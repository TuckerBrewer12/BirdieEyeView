import { Loader2, MapPin, X } from "lucide-react";
import { useTheme } from "@/brand/theme";
import { SearchField } from "./SearchField";
import { Panel } from "./Panel";
import { CourseLinkChip } from "./CourseLinkChip";
import { CustomNameChip } from "./CustomNameChip";
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
  const theme = useTheme();

  if (linkedName && onClear) return <CourseLinkChip name={linkedName} onClear={onClear} />;
  if (customName && onClear) return <CustomNameChip name={customName} onClear={onClear} />;

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
        <ul
          style={{
            listStyle: "none",
            margin: "6px 0 0",
            padding: 0,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {results.map((course, index) => (
            <li
              key={course.id}
              style={index > 0 ? { borderTop: `1px solid ${theme.border}` } : undefined}
            >
              <ResultRow
                course={course}
                linking={linking}
                onSelect={onSelectCourse}
              />
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !searching && reviewVariant && onUseCustomName && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            background: theme.mutedFill,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 12, color: theme.fgMuted }}>
            {results.length > 0 ? "Not the right course?" : "No match found"}
          </span>
          <button
            type="button"
            onClick={() => onUseCustomName(query.trim())}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.primary,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Save as "{query.trim()}"
          </button>
        </div>
      )}
      {query.trim().length >= 2 && !searching && results.length === 0 && !reviewVariant && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: theme.fgMuted }}>No courses found</p>
      )}
    </>
  );

  if (!title) return body;

  return (
    <Panel tone="info">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.fg }}>{title}</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: theme.fgMuted,
            display: "flex",
          }}
        >
          <X size={16} />
        </button>
      </div>
      {body}
    </Panel>
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
  const theme = useTheme();

  return (
    <button
      type="button"
      disabled={linking}
      onClick={() => onSelect(course)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 12px",
        textAlign: "left",
        background: "transparent",
        border: "none",
        cursor: linking ? "default" : "pointer",
        opacity: linking ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!linking) e.currentTarget.style.background = theme.mutedFill;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <MapPin size={13} color={theme.fgMuted} style={{ marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.fg }}>{course.name}</div>
        {course.location && (
          <div style={{ fontSize: 12, color: theme.fgMuted }}>{course.location}</div>
        )}
      </div>
      {linking && (
        <Loader2 size={12} color={theme.fgMuted} className="animate-spin" style={{ marginLeft: "auto", marginTop: 4 }} />
      )}
    </button>
  );
}
