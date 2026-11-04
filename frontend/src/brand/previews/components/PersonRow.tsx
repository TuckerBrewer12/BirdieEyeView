import { Button } from "@/brand/components/Button";
import { Collection } from "@/brand/components/Collection";
import { PersonRow } from "@/brand/components/PersonRow";

const card = "overflow-hidden rounded-card border border-border bg-card";

const friends = [
  { id: "a", name: "Avery Lin", detail: "avery@example.com" },
  { id: "b", name: "Jordan Castellanos-Whitfield", detail: "jordan.castellanos-whitfield@example.com" },
  { id: "c", name: "Sam", detail: "No email" },
];

const requests = [
  { id: "a", name: "Sam Kim", detail: "sam@example.com", pending: false },
  { id: "b", name: "Avery Lin", detail: "avery@example.com", pending: true },
];

/** Compose-style @Preview for PersonRow: the friends list, the inbox and an unknown person. */
export default function PersonRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Friends</p>
      <Collection
        layout="divided"
        className={card}
        items={friends}
        keyFor={(p) => p.id}
        renderItem={(p) => <PersonRow name={p.name} detail={p.detail} />}
      />

      <p className="mt-2.5 text-label font-semibold text-muted-foreground">Inbox · received and sent</p>
      <Collection
        layout="divided"
        className={card}
        items={requests}
        keyFor={(p) => p.id}
        renderItem={(p) => (
          <PersonRow
            name={p.name}
            detail={p.detail}
            meta="Updated Oct 3, 2026"
            actions={
              p.pending ? (
                <span className="text-xs font-medium text-muted-foreground">Pending</span>
              ) : (
                <>
                  <Button variant="ghost">Decline</Button>
                  <Button>Accept</Button>
                </>
              )
            }
          />
        )}
      />

      <div className={card}>
        <PersonRow name="Unknown user" initials="?" />
      </div>
    </>
  );
}
