import { Button } from "@/brand/components/Button";
import { CountBadge } from "@/brand/components/CountBadge";

export default function CountBadgePreview() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="outline">
        Requests
        <CountBadge count={1} />
      </Button>
      <Button variant="outline">
        Requests
        <CountBadge count={12} />
      </Button>
      <Button variant="outline">
        Requests
        <CountBadge count={0} />
      </Button>
    </div>
  );
}
