import { ToParFigure } from "@/brand/components/ToParFigure";

export default function ToParFigurePreview() {
  return (
    <div className="flex items-end gap-6">
      <ToParFigure toPar={-2} />
      <ToParFigure toPar={-1} />
      <ToParFigure toPar={0} />
      <ToParFigure toPar={2} />
      <ToParFigure toPar={-1} size="stat" />
      <ToParFigure toPar={4} size="stat" />
    </div>
  );
}
