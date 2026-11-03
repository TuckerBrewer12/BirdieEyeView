import type { ReactNode } from "react";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight, Copy } from "lucide-react";
import { cn } from "@/brand/cn";
import type { RenderLink } from "@/brand/nav";
import { Button } from "./Button";
import { Card } from "./Card";
import { Switch } from "./Switch";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

/** The classes every row shares: 56 tall at least, 16 in from either side. */
const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 text-left text-field font-medium text-foreground";

/** A row that is itself the control. */
const pressableClass = "outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted";

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
      <Card className="gap-0 divide-y divide-chart-grid py-0">{children}</Card>
    </section>
  );
}

function RowText({ label, description }: { label: ReactNode; description?: ReactNode }) {
  return (
    <span className="min-w-0 flex-1 py-1.5">
      <span className="block">{label}</span>
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
  /** Unset, the link is a plain anchor. */
  renderLink?: RenderLink;
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
  onAction: () => void;
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

function NavigateRowView({ label, description, value, href, renderLink, onClick, className }: NavigateRow) {
  return useRender({
    render: href == null ? <button type="button" /> : renderLink ? renderLink(href) : <a href={href} />,
    props: {
      className: cn(rowClass, pressableClass, className),
      onClick,
      children: (
        <>
          <RowText label={label} description={description} />
          {value != null && <span className="font-normal text-foreground-secondary">{value}</span>}
          <ChevronRight aria-hidden className="size-3.5 shrink-0 stroke-icon text-chart-reference" />
        </>
      ),
    },
  });
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
  return (
    <div className={cn(rowClass, "pr-3", className)}>
      <RowText label={label} description={description} />
      <ToggleGroup
        aria-label={typeof label === "string" ? label : undefined}
        value={value === undefined ? undefined : [value]}
        defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
        // Pressing the chosen option again would clear it; one is always chosen.
        onValueChange={(values) => values[0] && onValueChange?.(values[0] as V)}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
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
      return (
        <label className={cn(rowClass, "cursor-pointer", props.className)}>
          <RowText label={props.label} description={props.description} />
          <Switch
            checked={props.checked}
            defaultChecked={props.defaultChecked}
            disabled={props.disabled}
            onCheckedChange={props.onCheckedChange}
          />
        </label>
      );
    case "choose":
      return <ChooseRowView {...props} />;
    case "copy":
      return (
        <div className={cn(rowClass, "pr-2", props.className)}>
          <RowText label={props.label} description={props.description} />
          <span className="font-mono font-normal text-foreground-secondary">{props.value}</span>
          <Button variant="ghost" size="icon-lg" aria-label={props.actionLabel} onClick={props.onAction}>
            <Copy aria-hidden className="stroke-icon" />
          </Button>
        </div>
      );
    case "destructive":
      return (
        <button
          type="button"
          onClick={props.onClick}
          className={cn(
            rowClass,
            pressableClass,
            "min-h-13 font-semibold text-destructive hover:bg-destructive/5 focus-visible:bg-destructive/10",
            props.className,
          )}
        >
          {props.label}
        </button>
      );
  }
}

export { SettingsGroup, SettingsRow };
export type { SettingsGroupProps, SettingsRowProps };
