import { ChevronRight } from "lucide-react";
import { Card } from "@/brand/components/Card";
import { ListRow } from "@/brand/components/ListRow";

export default function ListRowPreview() {
  return (
    <Card className="divide-y divide-border py-0">
      <ListRow>
        <span aria-hidden className="size-10 rounded-full bg-muted" />
        <div className="flex-1">
          <p className="text-body-lg font-semibold">A row with two lines</p>
          <p className="text-body-sm text-muted-foreground">Its detail under it</p>
        </div>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </ListRow>
      <ListRow size="sm">
        <span className="flex-1 text-body-lg font-medium">A settings row</span>
        <span className="text-body-lg text-muted-foreground">Its value</span>
      </ListRow>
    </Card>
  );
}
