import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { MotionConfig } from "framer-motion";

const modules = import.meta.glob("./previews/*/*.tsx", {
  eager: true,
}) as Record<string, { default: ComponentType }>;

// Stories are addressed by file name alone, so `components/` and `charts/`
// share one namespace — a name in both would silently shadow the other.
const previews: Record<string, ComponentType> = {};
for (const [path, module] of Object.entries(modules)) {
  const story = path.slice(path.lastIndexOf("/") + 1, -".tsx".length);
  if (previews[story]) throw new Error(`Duplicate brand preview: ${story}`);
  previews[story] = module.default;
}

/** Hosts one Preview at a time — the Compose preview activity. */
export function BrandHarness() {
  const { story } = useParams<{ story: string }>();
  const Preview = story ? previews[story] : undefined;

  return (
    <MotionConfig reducedMotion="always">
      <div className="min-h-screen bg-background p-6">
        <div data-testid="brand-stage" className="flex w-preview flex-col gap-3">
          {Preview ? <Preview /> : <div>Unknown preview: {story}</div>}
        </div>
      </div>
    </MotionConfig>
  );
}
