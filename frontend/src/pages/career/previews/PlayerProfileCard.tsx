import { sampleCareer } from "@/testing/fixtures/career";
import { PlayerProfileCard } from "../components/PlayerProfileCard";

export default function PlayerProfileCardPreview() {
  return (
    <>
      <PlayerProfileCard profile={sampleCareer.profile} />
      {/* Too few axes with figures to draw a shape. */}
      <PlayerProfileCard profile={sampleCareer.profile.slice(0, 2)} />
    </>
  );
}
