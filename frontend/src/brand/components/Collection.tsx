import { Fragment, type Key, type ReactNode } from "react";
import { cn } from "@/brand/cn";

type CollectionLayout = "stack" | "grid" | "divided";

const layouts: Record<CollectionLayout, string> = {
  stack: "flex flex-col gap-2.5",
  grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  divided: "flex flex-col divide-y divide-border",
};

interface CollectionProps<T> {
  items: readonly T[];
  keyFor: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  layout?: CollectionLayout;
  loading?: boolean;
  loadingLabel?: ReactNode;
  empty?: ReactNode;
  className?: string;
}

function Collection<T>({
  items,
  keyFor,
  renderItem,
  layout = "stack",
  loading = false,
  loadingLabel = "Loading…",
  empty,
  className,
}: CollectionProps<T>) {
  const state = loading ? loadingLabel : items.length === 0 ? empty : null;

  if (state != null) {
    return (
      <div
        data-slot="collection"
        data-state={loading ? "loading" : "empty"}
        className={cn(
          "flex items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {state}
      </div>
    );
  }

  return (
    <div data-slot="collection" className={cn(layouts[layout], className)}>
      {items.map((item, index) => (
        <Fragment key={keyFor(item, index)}>{renderItem(item, index)}</Fragment>
      ))}
    </div>
  );
}

export { Collection };
export type { CollectionProps, CollectionLayout };
