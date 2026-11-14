import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/brand/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  revealAt?: number;
  className?: string;
}

const BAR =
  "fixed top-0 right-0 left-0 z-40 flex items-center border-b border-border bg-background/glass px-4 py-3 shadow-hairline backdrop-blur-xl md:left-rail md:px-8";

function PageHeaderText({ title, subtitle }: Pick<PageHeaderProps, "title" | "subtitle">) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground">{title}</h1>
      {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function RevealingPageHeader({
  revealAt,
  className,
  children,
}: {
  revealAt: number;
  className: string;
  children: ReactNode;
}) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [Math.max(0, revealAt - 30), revealAt], [0, 1]);

  return (
    <motion.header data-slot="page-header" className={className} style={{ opacity }}>
      {children}
    </motion.header>
  );
}

function PageHeader({ title, subtitle, revealAt, className }: PageHeaderProps) {
  const text = <PageHeaderText title={title} subtitle={subtitle} />;

  if (revealAt == null) {
    return (
      <header data-slot="page-header" className={cn(BAR, className)}>
        {text}
      </header>
    );
  }

  return (
    <RevealingPageHeader revealAt={revealAt} className={cn(BAR, className)}>
      {text}
    </RevealingPageHeader>
  );
}

export { PageHeader };
