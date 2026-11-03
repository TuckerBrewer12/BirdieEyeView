import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/brand";

interface AuthNoticeProps {
  tone: "success" | "error";
  children: ReactNode;
}

export function AuthNotice({ tone, children }: AuthNoticeProps) {
  if (!children) return null;
  const success = tone === "success";

  return (
    <Alert variant={success ? "success" : "destructive"} role={success ? "status" : "alert"}>
      {success ? <CircleCheck /> : <CircleAlert />}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
