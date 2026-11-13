import { ChevronRight } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { Card } from "@/brand/components/Card";
import { Collection } from "@/brand/components/Collection";
import { PersonRow } from "@/brand/components/PersonRow";

const friends = [
  { id: "a", name: "Avery Lin", detail: "Handicap 8.2 · played Oct 28" },
  { id: "b", name: "Jordan Castellanos-Whitfield", detail: "Handicap 14.6 · played Oct 12" },
  { id: "c", name: "Sam", detail: "No rounds yet" },
];

const requests = [
  { id: "a", name: "Riley Brooks", detail: "Oct 28", status: null },
  { id: "b", name: "Jordan Castellanos", detail: "Oct 12", status: "Friends" },
  { id: "c", name: "Sam Okafor", detail: "Sep 30", status: "Declined" },
];

/** The friends list (a Compare button, or a chevron on a phone), and the inbox: one open request, two settled. */
export default function PersonRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Friends</p>
      <Card className="py-0">
        <Collection
          layout="divided"
          items={friends}
          keyFor={(p) => p.id}
          renderItem={(p, i) => (
            <PersonRow
              name={p.name}
              detail={p.detail}
              actions={
                i === 0 ? (
                  <Button variant="outline" size="sm">
                    Compare
                  </Button>
                ) : (
                  <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                )
              }
            />
          )}
        />
      </Card>

      <p className="mt-2.5 text-label font-semibold text-muted-foreground">Requests · received</p>
      <Card className="py-0">
        <Collection
          layout="divided"
          items={requests}
          keyFor={(p) => p.id}
          renderItem={(p) => (
            <PersonRow
              name={p.name}
              detail={p.detail}
              settled={p.status != null}
              actions={
                p.status == null ? (
                  <>
                    <Button variant="outline" size="sm">
                      Decline
                    </Button>
                    <Button size="sm">Accept</Button>
                  </>
                ) : (
                  <span className="text-body font-semibold text-muted-foreground">{p.status}</span>
                )
              }
            />
          )}
        />
      </Card>
    </>
  );
}
