import { X } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/brand/components/Card";
import { Button } from "@/brand/components/Button";

export default function CardPreview() {
  return (
    <>
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
            <button
              type="button"
              aria-label="Unlink course"
              className="inline-flex text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Muni Tuesday</CardTitle>
          <CardDescription>Saving without a linked course</CardDescription>
          <CardAction>
            <button
              type="button"
              aria-label="Edit name"
              className="inline-flex text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </CardAction>
        </CardHeader>
      </Card>
    </>
  );
}
