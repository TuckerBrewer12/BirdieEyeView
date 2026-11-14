import { ToParFigure } from "@/brand/components/ToParFigure";

export default function ToParFigurePreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6">
        <ToParFigure toPar={-2} />
        <ToParFigure toPar={-1} />
        <ToParFigure toPar={0} />
        <ToParFigure toPar={2} />
        <ToParFigure toPar={-1} size="stat" />
        <ToParFigure toPar={4} size="stat" />
      </div>
      <div className="flex items-end gap-6 text-label font-bold">
        <ToParFigure toPar={-0.5} size="inherit" label={"−0.5"} />
        <ToParFigure toPar={0.5} size="inherit" label="+0.5" />
        <ToParFigure toPar={null} size="inherit" empty="-" />
        <ToParFigure toPar={1.2} size="inherit" label="1.2 strokes behind" />
      </div>
    </div>
  );
}
