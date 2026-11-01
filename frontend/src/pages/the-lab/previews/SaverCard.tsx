import { labGoalReport } from "@/testing/fixtures/lab";
import { SaverCard } from "../components/SaverCard";
import { goalStandingFrom } from "../model";

export default function SaverCardPreview() {
  const [first, second] = goalStandingFrom(89, labGoalReport)!.savers;
  return (
    <>
      <SaverCard saver={first} />
      <SaverCard saver={second} />
      {/* A saver the server rates past the whole gap still fills the bar once. */}
      <SaverCard
        saver={{
          kind: "par5_opportunity",
          strokesSaved: 3.1,
          shareOfGap: 140,
          headline: "You average +1.4 on par 5s",
          detail: "Laying up to a full wedge would save about 3.1 strokes a round.",
        }}
      />
    </>
  );
}
