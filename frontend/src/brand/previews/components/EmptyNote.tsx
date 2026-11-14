import { Card, CardContent, CardHeader, CardTitle } from "@/brand/components/Card";
import { EmptyNote } from "@/brand/components/EmptyNote";

export default function EmptyNotePreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Handicap Index Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyNote>No rounds in the last 365 days.</EmptyNote>
      </CardContent>
    </Card>
  );
}
