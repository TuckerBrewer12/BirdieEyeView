import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { MotionConfig } from "framer-motion";

const modules = import.meta.glob(["./previews/*/*.tsx", "../pages/**/previews/*.tsx"], {
  eager: true,
}) as Record<string, { default: ComponentType }>;

const previews: Partial<Record<string, ComponentType>> = {};
for (const [path, module] of Object.entries(modules)) {
  const story = path.slice(path.lastIndexOf("/") + 1, -".tsx".length);
  if (previews[story]) throw new Error(`Duplicate brand preview: ${story}`);
  previews[story] = module.default;
}

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
