import { ChevronLeft, Ellipsis, Plus, Share } from "lucide-react";
import { Button, RowButton } from "@/brand/components/Button";
import { cn } from "@/brand/cn";

/* Every variant the app uses, under the board's name where it has one. */
const rows = [
  { name: "Primary", variant: "default", label: "Save" },
  { name: "Secondary", variant: "outline", label: "Cancel" },
  { name: "Tonal", variant: "secondary", label: "Filter" },
  { name: "Ghost", variant: "ghost", label: "Skip" },
  { name: "Ghost destructive", variant: "ghostDestructive", label: "Discard" },
  { name: "Text", variant: "link", label: "Edit" },
  { name: "Muted text", variant: "linkMuted", label: "Clear" },
  { name: "Danger", variant: "destructive", label: "Delete" },
] as const;

const grid = "grid grid-cols-state-grid items-center gap-2";

/**
 * One theme's panel of the board: every variant at rest and disabled, then the
 * sizes. Hover is a pointer state, so the spec captures it by hovering each row.
 */
function Panel({ theme }: { theme: "Light" | "Dark" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 text-foreground",
        theme === "Dark" && "dark",
      )}
    >
      <div className={cn(grid, "text-label font-semibold text-muted-foreground")}>
        <div>{theme}</div>
        <div>Default</div>
        <div>Disabled</div>
      </div>
      {rows.map((row) => (
        <div key={row.name} className={grid} data-testid={`button-row-${theme.toLowerCase()}-${row.variant}`}>
          <div className="text-body-sm text-foreground-secondary">{row.name}</div>
          <Button variant={row.variant}>{row.label}</Button>
          <Button variant={row.variant} disabled>
            {row.label}
          </Button>
        </div>
      ))}
      <div className="my-1 h-px bg-border" />
      <div className="text-label font-semibold text-muted-foreground">Sizes · 48 / 40 / 32 / 24</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg">Save round</Button>
        <Button>Save</Button>
        <Button size="sm">Link</Button>
        <Button size="xs">Undo</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-lg" aria-label="More options">
          <Ellipsis />
        </Button>
        <Button variant="outline" size="icon" aria-label="More options">
          <Ellipsis />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="More options">
          <Ellipsis />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Add">
          <Plus />
        </Button>
      </div>
      <div className="text-label font-semibold text-muted-foreground">Toolbar · 44, an icon alone on a phone · inline</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="toolbar">
          <ChevronLeft data-icon="inline-start" />
          Rounds
        </Button>
        <Button variant="outline" size="toolbar-icon-phone" aria-label="Share">
          <Share />
          <span aria-hidden className="hidden md:inline">
            Share
          </span>
        </Button>
        <Button variant="outline" size="toolbar-icon" aria-label="More actions">
          <Ellipsis />
        </Button>
        <Button size="toolbar">Save</Button>
        <Button variant="linkMuted" size="inline">
          <ChevronLeft />
          Back to courses
        </Button>
      </div>
      <div className="text-label font-semibold text-muted-foreground">Large, pill</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" shape="pill">
          Start tracking
        </Button>
        <Button variant="outline" shape="pill">
          Sign in
        </Button>
      </div>
      <div className="text-label font-semibold text-muted-foreground">Row</div>
      <RowButton className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
        <span className="text-sm font-medium text-foreground">Pebble Beach Golf Links</span>
        <span className="text-sm text-muted-foreground">78</span>
      </RowButton>
    </div>
  );
}

/** The canvas board: the light and dark panels side by side. */
export default function ButtonPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 grid grid-cols-2 gap-4 bg-background p-6">
      <Panel theme="Light" />
      <Panel theme="Dark" />
    </div>
  );
}
