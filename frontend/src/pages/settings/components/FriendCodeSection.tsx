import { Alert, AlertDescription, SettingsGroup, SettingsRow } from "@/brand";
import { useCopyText } from "@/platform/useCopyText";

interface FriendCodeSectionProps {
  /** Null until the server has given the player one. */
  friendCode: string | null;
}

/** The code other players type to send a friend request, with a button to copy it. */
export function FriendCodeSection({ friendCode }: FriendCodeSectionProps) {
  const { copy, copied, failed } = useCopyText();

  return (
    <div className="flex flex-col gap-2">
      <SettingsGroup title="Friends">
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
