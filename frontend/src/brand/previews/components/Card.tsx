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

      <Card size="lg" className="gap-1.5 px-5">
        <div className="text-body text-muted-foreground">A figure card</div>
        <div className="text-figure">74.7</div>
      </Card>

      <Card corner="lead" render={<a href="#round" aria-label="Half Moon Bay, the lead card" />} className="px-6">
        <div className="text-body text-muted-foreground">The lead card, a link</div>
        <div className="text-name">Half Moon Bay</div>
      </Card>
    </>
  );
}
