import { Plus } from "lucide-react";
import { Button } from "@/brand/components/Button";

export default function ButtonPreview() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">Extra Small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-xs" aria-label="Add">
          <Plus />
        </Button>
        <Button size="icon-sm" aria-label="Add">
          <Plus />
        </Button>
        <Button size="icon" aria-label="Add">
          <Plus />
        </Button>
        <Button size="icon-lg" aria-label="Add">
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button>
          <Plus data-icon="inline-start" />
          New Branch
        </Button>
        <Button disabled>Disabled</Button>
      </div>
      <Button variant="outline" className="w-full">
        Load more
      </Button>
    </>
  );
}
