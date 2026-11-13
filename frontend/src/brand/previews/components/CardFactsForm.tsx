import { useState } from "react";
import { CardFactsForm } from "@/brand/components/CardFactsForm";
import { NO_CARD_FACTS, type CardFacts } from "@/domain";

/** Nothing said yet; then a name, scores to par, and putts and shots to green, ordered by drag. */
export default function CardFactsFormPreview() {
  const [blank, setBlank] = useState<CardFacts>(NO_CARD_FACTS);
  const [filled, setFilled] = useState<CardFacts>({
    name: "Tucker",
    writtenAs: "toPar",
    putts: true,
    shotsToGreen: true,
    rowOrder: ["score", "shots", "putts"],
    nameRow: "score",
  });
  return (
    <div className="flex max-w-lg flex-col gap-10">
      <CardFactsForm card={blank} onChange={(patch) => setBlank({ ...blank, ...patch })} idPrefix="blank" />
      <CardFactsForm card={filled} onChange={(patch) => setFilled({ ...filled, ...patch })} idPrefix="filled" />
    </div>
  );
}
