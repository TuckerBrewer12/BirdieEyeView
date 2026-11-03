import { CircleAlert, CircleCheck, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertDismiss,
  AlertLink,
  AlertTitle,
} from "@/brand/components/Alert";

const ALERTS = [
  { tone: "info", Icon: Info, title: "Course not linked", body: "Link it to see par-based stats.", action: "Link a course" },
  { tone: "success", Icon: CircleCheck, title: "Round saved", body: "Half Moon Bay · 78 (+6)" },
  { tone: "warning", Icon: CircleAlert, title: "3 holes need review", body: "Low confidence on holes 4, 11 and 16.", action: "Review holes" },
  { tone: "danger", Icon: CircleAlert, title: "Scan failed", body: "Retake the photo in better light.", action: "Retake photo" },
] as const;

export default function AlertPreview() {
  return (
    <>
      <div className="text-label font-semibold text-muted-foreground">Alert · solid (default)</div>
      {ALERTS.map(({ tone, Icon, title, body, ...rest }) => (
        <Alert key={tone} tone={tone}>
          <Icon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{body}</AlertDescription>
          {"action" in rest && <AlertLink href="#">{rest.action}</AlertLink>}
          <AlertDismiss />
        </Alert>
      ))}

      <div className="mt-2 text-label font-semibold text-muted-foreground">Alert · outline variant</div>
      {ALERTS.map(({ tone, Icon, title, body }) => (
        <Alert key={tone} tone={tone} variant="outline">
          <Icon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{body}</AlertDescription>
          <AlertDismiss />
        </Alert>
      ))}
    </>
  );
}
