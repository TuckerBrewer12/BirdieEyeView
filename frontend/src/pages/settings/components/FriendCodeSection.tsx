import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/brand";

interface FriendCodeSectionProps {
  friendCode: string | null;
}

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
    <Card>
      <CardHeader>
        <CardTitle>Friend code</CardTitle>
        <CardDescription>Share this code so other players can send you a friend request.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            readOnly
            aria-label="Friend code"
            value={friendCode ?? "Unavailable"}
            className="font-mono"
          />
          <Button variant="outline" onClick={copyCode} disabled={!friendCode}>
            {copy === "copied" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copy === "copied" ? "Copied" : "Copy"}
          </Button>
        </div>
        {copy === "failed" && (
          <p role="alert" className="text-xs font-medium text-destructive">
            Could not copy your friend code.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
