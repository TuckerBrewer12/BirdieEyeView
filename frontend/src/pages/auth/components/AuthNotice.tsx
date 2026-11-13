import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/brand";

interface AuthNoticeProps {
  /** `success` is news (a link sent) and is announced politely; `error` interrupts. */
  tone: "success" | "error";
  /** Nothing renders without one, so a view model's nullable message goes straight in. */
  children: string | null;
}

/** The one-line answer an auth screen shows above its form: what went through, or why not. */
export function AuthNotice({ tone, children }: AuthNoticeProps) {
  if (!children) return null;
  const success = tone === "success";

  return (
    <Alert tone={success ? "success" : "danger"}>
      {success ? <CircleCheck /> : <CircleAlert />}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
