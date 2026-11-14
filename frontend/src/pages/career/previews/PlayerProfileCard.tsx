import { sampleCareer } from "@/testing/fixtures/career";
import { PlayerProfileCard } from "../components/PlayerProfileCard";

export default function PlayerProfileCardPreview() {
  return (
    <>
      <PlayerProfileCard profile={sampleCareer.profile} />
      <PlayerProfileCard profile={sampleCareer.profile.slice(0, 2)} />
    </>
  );
}
