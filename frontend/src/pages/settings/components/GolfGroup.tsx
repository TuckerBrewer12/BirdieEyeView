import { Alert, AlertDescription, FieldError, Input, SettingsGroup, SettingsRow } from "@/brand";
import { useCopyText } from "@/platform/useCopyText";

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
  const { copy, copied, failed } = useCopyText();

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
              size="value"
              // Wide enough for the longest index a golfer types, "+5.6" or "54.0", and no more.
              className="w-14"
              type="text"
              inputMode="decimal"
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
          copied={copied}
          onCopy={() => {
            if (friendCode) void copy(friendCode);
          }}
        />
      </SettingsGroup>
      {failed && (
        <Alert tone="danger">
          <AlertDescription>Could not copy your friend code.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
