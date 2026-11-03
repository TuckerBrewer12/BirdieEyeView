import { useState, type ReactElement, type ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight, Copy } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { Switch } from "./Switch";

/** The classes every row shares: 56 tall at least, 16 in from either side. */
const rowClass = "flex min-h-14 items-center gap-3 px-4 text-foreground";

interface SettingsGroupProps {
  /** The small heading above the panel. Leave it off for a group of one, like a sign-out row. */
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A panel of `SettingsRow`s, a rule between each. Several groups stack with
 * a gap the caller sets; the destructive row goes in a group of its own, last.
 */
function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  return (
    <section data-slot="settings-group" className={cn("flex flex-col gap-2", className)}>
      {title != null && <h2 className="mx-1 text-body font-semibold text-muted-foreground">{title}</h2>}
      <div className="divide-y divide-chart-grid overflow-hidden rounded-panel border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

function RowText({ label, description }: { label: ReactNode; description?: ReactNode }) {
  return (
    <span className="min-w-0 flex-1 py-1.5">
      <span className="block text-row">{label}</span>
      {description != null && (
        <span className="block text-body font-normal text-muted-foreground">{description}</span>
      )}
    </span>
  );
}

interface RowBase {
  label: ReactNode;
  /** A quieter line under the label. */
  description?: ReactNode;
  className?: string;
}

/** Shows a value and a chevron, and opens a page. A link when it has an `href`, a button when not. */
interface NavigateRow extends RowBase {
  type: "navigate";
  value?: ReactNode;
  href?: string;
  /** Turns the href into the element the app's router needs, like `NavLink`'s. Plain anchor when unset. */
  renderLink?: (href: string) => ReactElement;
  onClick?: () => void;
}

/** An on/off that applies at once. */
interface SwitchRow extends RowBase {
  type: "switch";
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/** A segmented choice of two or three options. */
interface ChooseRow<V extends string = string> extends RowBase {
  type: "choose";
  options: ReadonlyArray<{ value: V; label: ReactNode }>;
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
}

/** A value, in a monospace face, with an icon button at the end to copy or act on it. */
interface CopyRow extends RowBase {
  type: "copy";
  value: string;
  /** What the icon button is called to assistive tech. */
  actionLabel: string;
  /** Called when the button is pressed. Unset, the value is copied to the clipboard. */
  onAction?: () => void;
}

/** Red text, no value. */
interface DestructiveRow extends Omit<RowBase, "description"> {
  type: "destructive";
  onClick?: () => void;
}

type SettingsRowProps<V extends string = string> =
  | NavigateRow
  | SwitchRow
  | ChooseRow<V>
  | CopyRow
  | DestructiveRow;

const plainAnchor = (href: string) => <a href={href} />;

function NavigateRowView({
  label,
  description,
  value,
  href,
  renderLink = plainAnchor,
  onClick,
  className,
}: NavigateRow) {
  const content = (
    <>
      <RowText label={label} description={description} />
      {value != null && <span className="text-row font-normal text-foreground-secondary">{value}</span>}
      <ChevronRight aria-hidden strokeWidth={1.8} className="size-3.5 shrink-0 text-chart-reference" />
    </>
  );
  return useRender({
    render: href != null ? renderLink(href) : <button type="button" />,
    props: {
      className: cn(
        rowClass,
        "w-full text-left no-underline outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted",
        className,
      ),
      onClick,
      children: content,
    },
  });
}

function SwitchRowView({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
}: SwitchRow) {
  return (
    <label className={cn(rowClass, "cursor-pointer", className)}>
      <RowText label={label} description={description} />
      <Switch
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange && ((next) => onCheckedChange(next))}
      />
    </label>
  );
}

function ChooseRowView<V extends string>({
  label,
  description,
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: ChooseRow<V>) {
  const [inner, setInner] = useState<V | undefined>(defaultValue);
  const selected = value ?? inner;
  const pick = (next: V) => {
    setInner(next);
    onValueChange?.(next);
  };
  return (
    <div className={cn(rowClass, "pr-3", className)}>
      <RowText label={label} description={description} />
      <div
        role="group"
        aria-label={typeof label === "string" ? label : undefined}
        className="flex shrink-0 gap-0.5 rounded-card bg-muted p-0.75"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === selected}
            onClick={() => pick(option.value)}
            className="h-7.5 rounded-lg px-3 text-body font-semibold text-foreground-secondary outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CopyRowView({ label, description, value, actionLabel, onAction, className }: CopyRow) {
  return (
    <div className={cn(rowClass, "pr-2", className)}>
      <RowText label={label} description={description} />
      <span className="font-mono text-row font-normal text-foreground-secondary">{value}</span>
      <Button
        type="button"
        variant="ghost"
        aria-label={actionLabel}
        className="size-10 rounded-card"
        onClick={onAction ?? (() => void navigator.clipboard?.writeText(value))}
      >
        <Copy aria-hidden strokeWidth={1.5} />
      </Button>
    </div>
  );
}

function DestructiveRowView({ label, onClick, className }: DestructiveRow) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-13 w-full px-4 text-left text-row font-semibold text-destructive outline-none transition-colors hover:bg-destructive/5 focus-visible:bg-destructive/10",
        className,
      )}
    >
      {label}
    </button>
  );
}

/**
 * One row of a settings screen, in one of five kinds picked by `type`:
 * `navigate` (a value and a chevron, opens a page), `switch` (on/off, applies
 * at once), `choose` (a segmented pick of two or three), `copy` (a value with
 * an icon button) and `destructive` (red text, in a group of its own, last).
 * Put them in a `SettingsGroup`, which draws the panel and the rules.
 */
function SettingsRow<V extends string = string>(props: SettingsRowProps<V>) {
  switch (props.type) {
    case "navigate":
      return <NavigateRowView {...props} />;
    case "switch":
      return <SwitchRowView {...props} />;
    case "choose":
      return <ChooseRowView {...props} />;
    case "copy":
      return <CopyRowView {...props} />;
    case "destructive":
      return <DestructiveRowView {...props} />;
  }
}

export { SettingsGroup, SettingsRow };
export type { SettingsGroupProps, SettingsRowProps };
