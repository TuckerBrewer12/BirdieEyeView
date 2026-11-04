import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SettingsGroup,
  SettingsRow,
} from "@/brand";

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
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Friend code</CardTitle>
        <CardDescription>Share this code so other players can send you a friend request.</CardDescription>
      </CardHeader>
      <SettingsGroup>
        <SettingsRow
          type="copy"
          label="Your code"
          value={friendCode ?? "Unavailable"}
          copied={copy === "copied"}
          disabled={!friendCode}
          onCopy={copyCode}
        />
      </SettingsGroup>
      {copy === "failed" && (
        <CardContent className="pb-4">
          <Alert variant="destructive">
            <AlertDescription>Could not copy your friend code.</AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
