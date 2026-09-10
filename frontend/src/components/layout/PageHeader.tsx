import { useScroll, useTransform, motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  scrollThreshold?: number;
}

export function PageHeader({ title, subtitle, scrollThreshold = 40 }: PageHeaderProps) {
  const { scrollY } = useScroll();
  const start = Math.max(0, scrollThreshold - 30);
  const end = scrollThreshold;

  // The whole header fades in, so the surface, hairline and shadow ride that
  // one opacity rather than each interpolating its own color. Interpolating
  // them here would mean literal rgba(), which cannot follow the color mode.
  const opacity = useTransform(scrollY, [start, end], [0, 1]);

  return (
    <motion.header
      className="fixed top-0 right-0 left-0 z-40 flex items-center border-b border-border bg-background/90 px-4 py-3 shadow-hairline backdrop-blur-[20px] md:left-64 md:px-8"
      style={{ opacity }}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </motion.header>
  );
}
