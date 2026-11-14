import { useState } from "react";
import { CardRowOrder } from "@/brand/components/CardRowOrder";
import type { CardRow } from "@/domain";

export default function CardRowOrderPreview() {
  const [three, setThree] = useState<{ rows: CardRow[]; name: CardRow }>({ rows: ["score", "shots", "putts"], name: "putts" });
  const [two, setTwo] = useState<{ rows: CardRow[]; name: CardRow }>({ rows: ["score", "putts"], name: "score" });
  return (
    <div className="flex max-w-md flex-col gap-8">
      <CardRowOrder rows={three.rows} nameRow={three.name} onChange={(rows, name) => setThree({ rows, name })} />
      <CardRowOrder rows={two.rows} nameRow={two.name} onChange={(rows, name) => setTwo({ rows, name })} />
    </div>
  );
}
