import type { ComponentProps } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, TrendAreaChart } from "@/brand";

type TrendCardProps = ComponentProps<typeof TrendAreaChart> & {
  title: string;
  description?: string | null;
  cardClassName?: string;
};

export function TrendCard({ title, description, cardClassName, ...chart }: TrendCardProps) {
  return (
    <Card data-slot="trend-card" className={cardClassName}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <TrendAreaChart aria-label={title} {...chart} />
      </CardContent>
    </Card>
  );
}
