import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/brand/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** How far the page scrolls before the bar has fully faded in. */
  scrollThreshold?: number;
  /** Sit in the parent instead of fixing to the window, always shown. For previews. */
  contained?: boolean;
}

const BAR =
  "z-40 flex items-center border-b border-border bg-background/90 px-4 py-3 shadow-hairline backdrop-blur-header md:px-8";

function Title({ title, subtitle }: Pick<PageHeaderProps, "title" | "subtitle">) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground">{title}</h1>
      {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ScrollingHeader({ title, subtitle, scrollThreshold = 40 }: PageHeaderProps) {
  const { scrollY } = useScroll();
  const start = Math.max(0, scrollThreshold - 30);

  // The whole header fades in, so the surface, hairline and shadow ride that
  // one opacity rather than each interpolating its own color. Interpolating
  // them here would mean literal rgba(), which cannot follow the color mode.
  const opacity = useTransform(scrollY, [start, scrollThreshold], [0, 1]);

  return (
    <motion.header
      data-slot="page-header"
      className={cn(BAR, "fixed top-0 right-0 left-0 md:left-64")}
      style={{ opacity }}
    >
      <Title title={title} subtitle={subtitle} />
    </motion.header>
  );
}

/**
 * The compact bar that fades in over the top of a page once its own title has
 * scrolled away. Offset on desktop to clear the sidebar.
 */
function PageHeader({ contained, ...props }: PageHeaderProps) {
  if (contained) {
    return (
      <header data-slot="page-header" className={BAR}>
        <Title title={props.title} subtitle={props.subtitle} />
      </header>
    );
  }
  return <ScrollingHeader {...props} />;
}

export { PageHeader };
