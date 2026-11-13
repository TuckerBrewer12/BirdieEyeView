import { cardRows, type CardFacts } from "@/domain";
import { CardRowOrder } from "./CardRowOrder";
import { Field, FieldLabel } from "./Field";
import { Input } from "./Input";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

/** The rows a card can have besides the score, as the chips name them. */
const EXTRA_ROWS = ["putts", "shotsToGreen"] as const;

interface CardFactsFormProps {
  card: CardFacts;
  onChange: (patch: Partial<CardFacts>) => void;
  /** Prefix for the fields' ids, when two forms could share a page. */
  idPrefix?: string;
}

/**
 * What the golfer tells the scan about their card: their name as written on it, how the scores are
 * written, which other rows it has, and, once it has more than scores, the rows' order with the
 * name beside its row. The scan page and the landing page's try-it both ask this way; `cardContext()`
 * words it for the scan.
 */
function CardFactsForm({ card, onChange, idPrefix = "card" }: CardFactsFormProps) {
  const rows = cardRows(card);
  return (
    <div data-slot="card-facts-form" className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Your name on the card</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="off"
          placeholder="e.g. Tucker"
          value={card.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>Scores written as</FieldLabel>
        <ToggleGroup
          fill
          aria-label="Scores written as"
          value={[card.writtenAs]}
          onValueChange={(values) => {
            // Pressing the chosen one again would clear it; one is always chosen.
            if (values[0] === "strokes" || values[0] === "toPar") onChange({ writtenAs: values[0] });
          }}
        >
          <ToggleGroupItem value="strokes">
            Strokes <span className="font-normal text-muted-foreground">4 5 3</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="toPar">
            To par <span className="font-normal text-muted-foreground">+1 −1 E</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <Field>
        <FieldLabel>Also on the card</FieldLabel>
        <ToggleGroup
          look="chips"
          multiple
          aria-label="Also on the card"
          value={EXTRA_ROWS.filter((row) => card[row])}
          onValueChange={(values: string[]) =>
            onChange({ putts: values.includes("putts"), shotsToGreen: values.includes("shotsToGreen") })
          }
        >
          <ToggleGroupItem value="putts">Putts</ToggleGroupItem>
          <ToggleGroupItem value="shotsToGreen">Shots to green</ToggleGroupItem>
        </ToggleGroup>
      </Field>
      {rows.length > 1 && (
        <CardRowOrder
          rows={rows}
          nameRow={card.nameRow ?? "score"}
          onChange={(rowOrder, nameRow) => onChange({ rowOrder, nameRow })}
        />
      )}
    </div>
  );
}

export { CardFactsForm };
