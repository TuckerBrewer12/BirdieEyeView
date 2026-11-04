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
  /** Stable identity per item. Index is a last resort — it breaks exit animations. */
  keyFor: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  layout?: CollectionLayout;
  loading?: boolean;
  /** Shown while `loading`. */
  loadingLabel?: ReactNode;
  /** Shown when `items` is empty and not loading. */
  empty?: ReactNode;
  className?: string;
}

/**
 * A list of items, plus the two states every list has to handle anyway.
 *
 * Callers were each writing `loading ? … : items.length === 0 ? … : items.map(…)`
 * and styling the two branches slightly differently every time. This owns that
 * cascade and the layout; the caller owns the item and any surrounding chrome,
 * which it can style through `className`.
 *
 * `renderItem` may return a fragment, so an item can be followed by something
 * else — a row and the panel it expands into stay one entry in the layout.
 */
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

  // The state replaces the items but keeps the caller's chrome, so an empty
  // list still reads as the same surface rather than collapsing to nothing.
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
