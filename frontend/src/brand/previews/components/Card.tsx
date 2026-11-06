import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/brand/components/Card";
import { Button, ClearButton } from "@/brand/components/Button";

export default function CardPreview() {
  return (
    <>
      <Card>
        <CardContent className="text-foreground-secondary">
          Default card. Border only, no shadow.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pebble Beach Golf Links</CardTitle>
          <CardDescription>Pebble Beach, CA</CardDescription>
          <CardAction>
            <Button variant="outline" size="xs">Link</Button>
          </CardAction>
        </CardHeader>
        <CardContent>Four tees · Par 72</CardContent>
        <CardFooter>Link this round</CardFooter>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Linked</CardTitle>
          <CardDescription>Pebble Beach Golf Links</CardDescription>
          <CardAction>
            <ClearButton label="Unlink course" />
          </CardAction>
        </CardHeader>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Muni Tuesday</CardTitle>
          <CardDescription>Saving without a linked course</CardDescription>
          <CardAction>
            <ClearButton label="Edit name" />
          </CardAction>
        </CardHeader>
      </Card>
    </>
  );
}
