import { useId, type ReactNode } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { Card } from "./Card";
import { ListRow } from "./ListRow";
import { Switch } from "./Switch";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  const titleId = useId();
  return (
    <section
      data-slot="settings-group"
      aria-labelledby={title ? titleId : undefined}
      className={cn("flex flex-col gap-2", className)}
    >
      {title && (
        <h2 id={titleId} className="mx-1 text-body font-semibold text-muted-foreground">
          {title}
        </h2>
      )}
      <Card className="gap-0 divide-y divide-border py-0">{children}</Card>
    </section>
  );
}

interface RowBase {
  label: string;
}

interface SwitchRow extends RowBase {
  type: "switch";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface ChooseRow<V extends string = string> extends RowBase {
  type: "choose";
  options: ReadonlyArray<{ value: V; label: ReactNode }>;
  value: V;
  onValueChange: (value: V) => void;
}

interface CopyRow extends RowBase {
  type: "copy";
  value: string;
  onCopy: () => void;
  copied?: boolean;
  disabled?: boolean;
}

interface LinkRow extends RowBase {
  type: "link";
  value: ReactNode;
  onClick: () => void;
}

interface FieldRow extends RowBase {
  type: "field";
  controlId: string;
  control: ReactNode;
  note?: ReactNode;
}

interface ActionRow extends RowBase {
  type: "action";
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

type SettingsRowProps<V extends string = string> =
  | SwitchRow
  | ChooseRow<V>
  | CopyRow
  | LinkRow
  | FieldRow
  | ActionRow;

const LABEL = "min-w-0 flex-1 text-left text-body-lg font-medium text-foreground";

function SettingsRow<V extends string = string>(props: SettingsRowProps<V>) {
  const labelId = useId();
  const text = (
    <span id={labelId} className={LABEL}>
      {props.label}
    </span>
  );

  switch (props.type) {
    case "switch":
      return (
        <ListRow slot="settings-row" size="sm">
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch">
            {text}
            <Switch aria-labelledby={labelId} checked={props.checked} onCheckedChange={props.onCheckedChange} />
          </label>
        </ListRow>
      );
    case "choose":
      return (
        <ListRow slot="settings-row" size="sm" className="flex-col items-stretch gap-2.5 py-3 md:flex-row md:items-center md:py-1.5">
          {text}
          <ToggleGroup
            look="boxed"
            aria-labelledby={labelId}
            className="w-full md:w-fit"
            value={[props.value]}
            onValueChange={(values) => values[0] && props.onValueChange(values[0] as V)}
          >
            {props.options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="flex-1 md:flex-none">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ListRow>
      );
    case "copy":
      return (
        <ListRow slot="settings-row" size="sm" className="pr-2">
          {text}
          <span className="font-mono text-body-lg text-foreground-secondary">{props.value}</span>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={props.copied ? "Copied" : `Copy ${props.label.toLowerCase()}`}
            disabled={props.disabled}
            onClick={props.onCopy}
          >
            {props.copied ? <Check aria-hidden className="stroke-icon" /> : <Copy aria-hidden className="stroke-icon" />}
          </Button>
        </ListRow>
      );
    case "link":
      return (
        <button
          type="button"
          data-slot="settings-row"
          onClick={props.onClick}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 pr-3 pl-4 text-left transition-colors hover:bg-muted/half focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/half focus-visible:ring-inset"
        >
          <span className={LABEL}>{props.label}</span>
          <span className="min-w-0 truncate text-body-lg text-foreground-secondary">{props.value}</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      );
    case "field":
      return (
        <ListRow slot="settings-row" size="sm" className="flex-wrap">
          <label htmlFor={props.controlId} className={LABEL}>
            {props.label}
          </label>
          {props.control}
          {props.note != null && <div className="w-full pb-1.5">{props.note}</div>}
        </ListRow>
      );
    case "action":
      return (
        <button
          type="button"
          data-slot="settings-row"
          onClick={props.onClick}
          disabled={props.disabled}
          className={cn(
            "flex min-h-13 w-full cursor-pointer items-center px-4 text-left text-body-lg font-semibold transition-colors hover:bg-muted/half focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/half focus-visible:ring-inset disabled:cursor-default disabled:opacity-half",
            props.tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {props.label}
        </button>
      );
  }
}

export { SettingsGroup, SettingsRow };
export type { SettingsGroupProps, SettingsRowProps };
