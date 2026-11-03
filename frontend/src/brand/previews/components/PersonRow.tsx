import { Button } from "@/brand/components/Button";
import { Collection } from "@/brand/components/Collection";
import { PersonRow } from "@/brand/components/PersonRow";

const people = [
  { id: "a", name: "Avery Lin", email: "avery@example.com" },
  { id: "b", name: "Jordan Castellanos-Whitfield", email: "jordan.castellanos-whitfield@example.com" },
  { id: "c", name: "Sam", email: null },
];

export default function PersonRowPreview() {
  return (
    <>
      <Collection
        layout="divided"
        className="overflow-hidden rounded-card border border-border bg-card"
        items={people}
        keyFor={(p) => p.id}
        renderItem={(p) => <PersonRow name={p.name} detail={p.email ?? "No email"} />}
      />

      <Collection
        layout="divided"
        className="overflow-hidden rounded-card border border-border bg-card"
        items={people.slice(0, 2)}
        keyFor={(p) => p.id}
        renderItem={(p, i) => (
          <PersonRow
            name={p.name}
            detail={p.email}
            meta="Updated Oct 3, 2026"
            actions={
              i === 0 ? (
                <>
                  <Button size="sm">Accept</Button>
                  <Button size="sm" variant="outline">Decline</Button>
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">Pending</span>
              )
            }
          />
        )}
      />

      <div className="overflow-hidden rounded-card border border-border bg-card">
        <PersonRow name="Unknown user" initials="?" />
      </div>
    </>
  );
}
