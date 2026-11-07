import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/brand/components/Alert";

const ALERTS = [
  { tone: "info", Icon: Info, title: "Course not linked", body: "Link it to see par-based stats." },
  { tone: "success", Icon: CircleCheck, title: "Round saved", body: "Half Moon Bay · 78 (+6)" },
  { tone: "warning", Icon: CircleAlert, title: "3 holes need review", body: "Low confidence on holes 4, 11 and 16." },
  { tone: "danger", Icon: CircleAlert, title: "Scan failed", body: "Retake the photo in better light." },
] as const;

export default function AlertPreview() {
  return (
    <>
      <div className="text-label font-semibold text-muted-foreground">Alert · solid (default)</div>
      {ALERTS.map(({ tone, Icon, title, body }) => (
        <Alert key={tone} tone={tone}>
          <Icon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{body}</AlertDescription>
        </Alert>
      ))}

      <div className="mt-2 text-label font-semibold text-muted-foreground">Alert · outline variant</div>
      {ALERTS.map(({ tone, Icon, title, body }) => (
        <Alert key={tone} tone={tone} variant="outline">
          <Icon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{body}</AlertDescription>
        </Alert>
      ))}
    </>
  );
}
