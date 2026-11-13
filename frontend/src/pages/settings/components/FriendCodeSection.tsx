import { useState } from "react";
import { Alert, AlertDescription, SettingsGroup, SettingsRow } from "@/brand";

interface FriendCodeSectionProps {
  /** Null until the server has given the player one. */
  friendCode: string | null;
}

/** The code other players type to send a friend request, with a button to copy it. */
export function FriendCodeSection({ friendCode }: FriendCodeSectionProps) {
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
      <SettingsGroup title="Friends">
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
