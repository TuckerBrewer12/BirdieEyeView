import { Collection } from "@/brand/components/Collection";
import { ListRow } from "@/brand/components/ListRow";

const rows = [
  { id: "a", title: "Two lines", detail: "64 tall, the rule drawn by the Collection" },
  { id: "b", title: "A long title that runs past the width of the row and truncates", detail: "Second line" },
];

/** Compose-style @Preview for ListRow: the shell rows sit in, in a divided Collection. */
export default function ListRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Rows</p>
      <Collection
        layout="divided"
        className="overflow-hidden rounded-card border border-border bg-card"
        items={rows}
        keyFor={(row) => row.id}
        renderItem={(row) => (
          <ListRow>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-lg font-semibold text-foreground">{row.title}</p>
              <p className="truncate text-body text-muted-foreground">{row.detail}</p>
            </div>
          </ListRow>
        )}
      />
    </>
  );
}
