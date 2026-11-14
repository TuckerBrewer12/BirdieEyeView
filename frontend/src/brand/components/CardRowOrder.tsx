import { useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/brand/cn";
import type { CardRow } from "@/domain";

const ROWS: Record<CardRow, { label: string; tone: string }> = {
  score: { label: "Score", tone: "border-scan-row-score bg-scan-row-score" },
  putts: { label: "Putts", tone: "border-scan-row-putts bg-scan-row-putts" },
  shots: { label: "Shots to Green", tone: "border-scan-row-shots bg-scan-row-shots" },
};

interface CardRowOrderProps {
  rows: readonly CardRow[];
  nameRow: CardRow;
  onChange: (rows: CardRow[], nameRow: CardRow) => void;
  className?: string;
}

type Drag = { type: "row"; from: number } | { type: "name" };

function CardRowOrder({ rows, nameRow, onChange, className }: CardRowOrderProps) {
  const dragging = useRef<Drag | null>(null);
  const nameAt = rows.includes(nameRow) ? rows.indexOf(nameRow) : rows.indexOf("score");

  const moveTo = (to: number) => {
    const drag = dragging.current;
    if (!drag || to < 0 || to >= rows.length) return;
    if (drag.type === "name") {
      if (rows[to] !== nameRow) onChange([...rows], rows[to]);
      return;
    }
    if (drag.from === to) return;
    const next = [...rows];
    const [row] = next.splice(drag.from, 1);
    next.splice(to, 0, row);
    dragging.current = { type: "row", from: to };
    onChange(next, nameRow);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!dragging.current || event.touches.length === 0) return;
    const touch = event.touches[0];
    const host = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>("[data-row-index]");
    const index = host?.dataset.rowIndex;
    if (index == null) return;
    event.preventDefault();
    moveTo(Number.parseInt(index, 10));
  };
  const end = () => {
    dragging.current = null;
  };

  return (
    <div data-slot="card-row-order" className={cn("flex flex-col gap-2", className)}>
      <p className="text-body text-muted-foreground">Drag the rows to match your card, and Name to your row.</p>
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div
            key={row}
            data-row-index={i}
            className="flex gap-2"
            onDragOver={(event) => {
              event.preventDefault();
              moveTo(i);
            }}
            onTouchMove={onTouchMove}
            onTouchEnd={end}
            onTouchCancel={end}
          >
            <div className="w-16 shrink-0">
              {i === nameAt ? (
                <div
                  draggable
                  aria-label={`Name, beside the ${ROWS[row].label.toLowerCase()} row`}
                  onDragStart={() => (dragging.current = { type: "name" })}
                  onDragEnd={end}
                  onTouchStart={() => (dragging.current = { type: "name" })}
                  className="flex h-full min-h-10 cursor-grab touch-none items-center justify-center rounded-lg border border-scan-row-name bg-scan-row-name select-none active:cursor-grabbing"
                >
                  <span className="text-meta font-bold tracking-chip text-primary-foreground uppercase">Name</span>
                </div>
              ) : (
                <div className="h-full min-h-10 rounded-lg border border-dashed border-border" />
              )}
            </div>
            <div
              draggable
              onDragStart={() => (dragging.current = { type: "row", from: i })}
              onDragEnd={end}
              onTouchStart={() => (dragging.current = { type: "row", from: i })}
              className={cn(
                "flex flex-1 cursor-grab touch-none items-center gap-2 rounded-lg border px-3 py-2.5 select-none active:cursor-grabbing",
                ROWS[row].tone,
              )}
            >
              <GripVertical aria-hidden className="size-icon-sm shrink-0 text-primary-foreground/half" />
              <span className="text-body font-semibold text-primary-foreground">{ROWS[row].label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { CardRowOrder };
