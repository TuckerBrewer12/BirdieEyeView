import { Button } from "@/brand/components/Button";
import { Collection } from "@/brand/components/Collection";
import { PersonRow } from "@/brand/components/PersonRow";
import { personAvatarFills } from "@/brand/components/variants";
import { cn } from "@/brand/cn";

const friends = [
  { id: "a", name: "Avery Lin", handicap: "Handicap 9.8" },
  { id: "b", name: "Jordan Castellanos", handicap: "Handicap 14.1" },
];

/** Compose-style @Preview for PersonRow. */
export default function PersonRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Person row · friend and request</p>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <Collection
          layout="rows"
          items={friends}
          keyFor={(f) => f.id}
          renderItem={(f) => (
            <PersonRow
              href="#"
              name={f.name}
              detail={f.handicap}
              actions={<span className="text-body font-semibold text-primary">Compare</span>}
            />
          )}
        />
        <PersonRow
          name="Sam Kim"
          detail="Wants to be friends"
          actions={
            <>
              <Button variant="ghost">Decline</Button>
              <Button>Accept</Button>
            </>
          }
        />
      </div>

      <p className="mt-2.5 text-label font-semibold text-muted-foreground">Avatar colors</p>
      <div className="flex gap-2">
        {personAvatarFills.map((fill) => (
          <span key={fill} className={cn("size-7 rounded-full", fill)} />
        ))}
      </div>
    </>
  );
}
