import { Card, CardContent, CardHeader, CardTitle } from "@/brand/components/Card";
import { EmptyState } from "@/brand/components/EmptyState";

export default function EmptyStatePreview() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Putting</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState>No putting data yet</EmptyState>
        </CardContent>
      </Card>

      {/* On the page itself, with no card around it. */}
      <EmptyState>No rounds match these filters. Try widening them.</EmptyState>
    </>
  );
}
