import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useTheme } from "@/brand/theme";

const modules = import.meta.glob("./previews/*.tsx", {
  eager: true,
}) as Record<string, { default: ComponentType }>;

const previews: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [
    path.slice(path.lastIndexOf("/") + 1, -".tsx".length),
    module.default,
  ]),
);

/** Hosts one Preview at a time — the Compose preview activity. */
export function BrandHarness() {
  const { story } = useParams<{ story: string }>();
  const theme = useTheme();
  const Preview = story ? previews[story] : undefined;

  return (
    <MotionConfig reducedMotion="always">
      <div style={{ minHeight: "100vh", background: theme.page, padding: 24 }}>
        <div
          data-testid="brand-stage"
          style={{
            width: 390,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {Preview ? <Preview /> : <div>Unknown preview: {story}</div>}
        </div>
      </div>
    </MotionConfig>
  );
}
