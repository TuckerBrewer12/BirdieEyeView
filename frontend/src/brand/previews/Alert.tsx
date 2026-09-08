import { CircleAlert, Info } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/brand/components/Alert";
import { Button } from "@/brand/components/Button";

export default function AlertPreview() {
  return (
    <>
      <Alert variant="destructive">
        <AlertDescription>
          Could not link that round to the selected course.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Scan failed</AlertTitle>
        <AlertDescription>
          We couldn't read the scorecard. Try a photo with less glare.
        </AlertDescription>
      </Alert>

      <Alert>
        <Info />
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>
          This round isn't linked to a course, so par is taken from the card.
        </AlertDescription>
        <AlertAction>
          <Button>Link</Button>
        </AlertAction>
      </Alert>
    </>
  );
}
