import { useState } from "react";
import { Alert, AlertDescription, FieldError, Input, SettingsGroup, SettingsRow } from "@/brand";

const HANDICAP_ID = "settings-handicap";

interface GolfGroupProps {
  /** The handicap as typed. */
  handicap: string;
  /** Why it can't be saved, or null. */
  handicapError: string | null;
  onHandicapChange: (value: string) => void;
  /** The home course's name as shown, or null for none. */
  homeCourse: string | null;
  onOpenHomeCourse: () => void;
  /** Null until the server has given the player one. */
  friendCode: string | null;
}

/** The golf settings: the handicap index set by hand, the home course, and the friend code to copy. */
export function GolfGroup({
  handicap,
  handicapError,
  onHandicapChange,
  homeCourse,
  onOpenHomeCourse,
  friendCode,
}: GolfGroupProps) {
  const [copy, setCopy] = useState<"copied" | "failed" | null>(null);

  const copyCode = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingsGroup title="Golf">
        <SettingsRow
          type="field"
          label="Handicap index"
          controlId={HANDICAP_ID}
          control={
            <Input
              id={HANDICAP_ID}
              size="inline"
              type="text"
              inputMode="decimal"
              className="w-22 text-right"
              value={handicap}
              onChange={(event) => onHandicapChange(event.target.value)}
              placeholder="None"
              aria-invalid={handicapError != null}
              aria-describedby={handicapError ? `${HANDICAP_ID}-error` : undefined}
            />
          }
          note={handicapError ? <FieldError id={`${HANDICAP_ID}-error`}>{handicapError}</FieldError> : undefined}
        />
        <SettingsRow type="link" label="Home course" value={homeCourse ?? "None"} onClick={onOpenHomeCourse} />
        <SettingsRow
          type="copy"
          label="Friend code"
          value={friendCode ?? "Unavailable"}
          disabled={!friendCode}
          copied={copy === "copied"}
          onCopy={() => void copyCode()}
        />
      </SettingsGroup>
      {copy === "failed" && (
        <Alert tone="danger">
          <AlertDescription>Could not copy your friend code.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
