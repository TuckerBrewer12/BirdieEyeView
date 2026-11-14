import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
      </Card>

      {/* A narrow header drops a wide action under its title. */}
      <Card size="sm" className="max-w-xs">
        <CardHeader>
          <CardTitle>Player profile</CardTitle>
          <CardAction wrap className="flex gap-2">
            <Button variant="outline" size="xs">Average</Button>
            <Button variant="outline" size="xs">vs 15 handicap</Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card size="lg" className="gap-1.5 px-5">
        <div className="text-body text-muted-foreground">A figure card</div>
        <div className="text-figure">74.7</div>
      </Card>

      <Card corner="lead" render={<a href="#round" aria-label="Half Moon Bay, the lead card" />} interactive className="px-6">
        <div className="text-body text-muted-foreground">The lead card, a link</div>
        <div className="text-name">Half Moon Bay</div>
      </Card>

      {/* A card that heads a section: its title is a heading. */}
      <Card size="lg">
        <CardHeader>
          <CardTitle level={2} className="text-body-lg font-semibold">
            Round flow
          </CardTitle>
          <CardAction className="text-body-sm text-muted-foreground">Out +4 · In +2</CardAction>
        </CardHeader>
      </Card>

      {/* surface="none": the card's spacing with no surface, as inside a sheet. */}
      <div className="rounded-xl bg-muted p-3">
        <Card surface="none" size="sm">
          <CardHeader>
            <CardTitle>On the sheet's own surface</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
