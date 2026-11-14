import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/brand";

interface AuthNoticeProps {
  tone: "success" | "error";
  children: string | null;
  id?: string;
}

export function AuthNotice({ tone, children, id }: AuthNoticeProps) {
  if (!children) return null;
  const success = tone === "success";

  return (
    <Alert tone={success ? "success" : "danger"}>
      {success ? <CircleCheck /> : <CircleAlert />}
      <AlertDescription id={id}>{children}</AlertDescription>
    </Alert>
  );
}
