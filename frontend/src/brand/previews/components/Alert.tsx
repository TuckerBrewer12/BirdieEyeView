import { ArrowRight, CircleAlert, CircleCheck, Info } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/brand/components/Alert";
import { Button } from "@/brand/components/Button";

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

      <div className="mt-2 text-label font-semibold text-muted-foreground">Alert · with an action</div>
      <Alert tone="danger">
        <AlertDescription>We couldn&apos;t load your rounds.</AlertDescription>
        <AlertAction>
          <Button size="xs" variant="outline">
            Retry
          </Button>
        </AlertAction>
      </Alert>
      <Alert tone="danger">
        <CircleAlert />
        <AlertTitle>Couldn&apos;t read this card</AlertTitle>
        <AlertDescription>Try a flatter, brighter photo.</AlertDescription>
        <AlertAction>
          <Button variant="outline">
            Try another photo
            <ArrowRight data-icon="inline-end" />
          </Button>
        </AlertAction>
      </Alert>
      <Alert tone="info" variant="outline">
        <AlertTitle>Course not linked</AlertTitle>
        <AlertDescription>Link it to see par-based stats.</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="secondary">
            Link course
          </Button>
        </AlertAction>
      </Alert>
    </>
  );
}
