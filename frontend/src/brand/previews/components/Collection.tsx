import { Collection } from "@/brand/components/Collection";

const fruit = [
  { id: "a", name: "Stack item one" },
  { id: "b", name: "Stack item two" },
  { id: "c", name: "Stack item three" },
];

export default function CollectionPreview() {
  return (
    <>
      <Collection
        items={fruit}
        keyFor={(f) => f.id}
        renderItem={(f) => (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
            {f.name}
          </div>
        )}
      />

      <Collection
        layout="grid"
        items={fruit}
        keyFor={(f) => f.id}
        renderItem={(f) => (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
            {f.name}
          </div>
        )}
      />

      <Collection
        layout="divided"
        className="overflow-hidden rounded-xl border border-border bg-card"
        items={fruit}
        keyFor={(f) => f.id}
        renderItem={(f) => (
          <div className="px-3 py-2 text-sm text-card-foreground">{f.name}</div>
        )}
      />

      <Collection
        className="rounded-xl border border-border bg-card"
        items={[]}
        keyFor={(_, i) => i}
        renderItem={() => null}
        empty="No rounds found."
      />

      <Collection
        className="rounded-xl border border-border bg-card"
        items={[]}
        keyFor={(_, i) => i}
        renderItem={() => null}
        loading
        loadingLabel="Loading rounds…"
      />
    </>
  );
}
