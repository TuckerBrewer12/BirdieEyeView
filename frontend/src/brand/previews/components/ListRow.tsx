import { ListRow } from "@/brand/components/ListRow";

const card = "overflow-hidden rounded-card border border-border bg-card";

function Lines({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-row text-foreground">{title}</p>
      <p className="truncate text-body text-muted-foreground">{detail}</p>
    </div>
  );
}

/** Compose-style @Preview for ListRow: the three forms a row takes, divided by chart-grid rules. */
export default function ListRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Rows · link, button, plain</p>
      <div className={card}>
        <ListRow slot="list-row" href="#">
          <Lines title="Link row" detail="The whole row is an anchor" />
        </ListRow>
        <ListRow slot="list-row" onClick={() => undefined}>
          <Lines title="Button row" detail="The whole row is a button" />
        </ListRow>
        <ListRow slot="list-row">
          <Lines title="Plain row" detail="Not a tap target" />
        </ListRow>
      </div>
    </>
  );
}
