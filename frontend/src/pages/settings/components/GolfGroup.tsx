import { Alert, AlertDescription, FieldError, Input, SettingsGroup, SettingsRow } from "@/brand";
import { useCopyText } from "@/platform/useCopyText";

const HANDICAP_ID = "settings-handicap";

interface GolfGroupProps {
  handicap: string;
  handicapError: string | null;
  onHandicapChange: (value: string) => void;
  homeCourse: string | null;
  onOpenHomeCourse: () => void;
  friendCode: string | null;
}

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
