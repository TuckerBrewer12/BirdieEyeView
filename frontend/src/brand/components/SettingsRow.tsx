import { useId, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { ListRow } from "./ListRow";
import { Switch } from "./Switch";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

interface SettingsGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * The rows of a settings card, under its header and flush to its edges, with
 * a rule above the first and between each.
 */
function SettingsGroup({ children, className }: SettingsGroupProps) {
  return (
    <div
      data-slot="settings-group"
      className={cn("flex flex-col divide-y divide-border border-t border-border", className)}
    >
      {children}
    </div>
  );
}

interface RowBase {
  label: string;
}

/** An on/off. The whole row toggles it. */
interface SwitchRow extends RowBase {
  type: "switch";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** A segmented choice of two or three options. One is always chosen. */
interface ChooseRow<V extends string = string> extends RowBase {
  type: "choose";
  options: ReadonlyArray<{ value: V; label: ReactNode }>;
  value: V;
  onValueChange: (value: V) => void;
}

/** A value, in a monospace face, with an icon button at the end that copies it. */
interface CopyRow extends RowBase {
  type: "copy";
  value: string;
  onCopy: () => void;
  /** Shows a check and names the button "Copied". */
  copied?: boolean;
  disabled?: boolean;
}

type SettingsRowProps<V extends string = string> = SwitchRow | ChooseRow<V> | CopyRow;

/**
 * One row of a settings card, 56 tall, in one of three kinds picked by `type`:
 * `switch` (on/off), `choose` (a segmented pick of two or three) and `copy`
 * (a value with an icon button). Put them in a `SettingsGroup`.
 */
function SettingsRow<V extends string = string>(props: SettingsRowProps<V>) {
  const labelId = useId();
  const text = (
    <span id={labelId} className="min-w-0 flex-1 text-body-lg font-medium text-foreground">
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
        <ListRow slot="settings-row" size="sm">
          {text}
          <ToggleGroup
            aria-labelledby={labelId}
            size="sm"
            value={[props.value]}
            // Pressing the chosen option again would clear it; one is always chosen.
            onValueChange={(values) => values[0] && props.onValueChange(values[0] as V)}
          >
            {props.options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ListRow>
      );
    case "copy":
      return (
        <ListRow slot="settings-row" size="sm">
          {text}
          <span className="font-mono text-body-lg text-foreground-secondary">{props.value}</span>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={props.copied ? "Copied" : "Copy"}
            disabled={props.disabled}
            onClick={props.onCopy}
          >
            {props.copied ? <Check aria-hidden className="stroke-icon" /> : <Copy aria-hidden className="stroke-icon" />}
          </Button>
        </ListRow>
      );
  }
}

export { SettingsGroup, SettingsRow };
export type { SettingsGroupProps, SettingsRowProps };
