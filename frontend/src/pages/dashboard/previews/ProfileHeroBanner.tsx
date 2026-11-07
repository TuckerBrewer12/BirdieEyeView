import { ProfileHeroBanner } from "../components/ProfileHeroBanner";
import { initialsOf } from "@/domain";
import { dashboardUser } from "@/testing/fixtures/dashboard";

export default function ProfileHeroBannerPreview() {
  return (
    <>
      <ProfileHeroBanner
        initials={initialsOf(dashboardUser.name, "G")}
        handicapIndex={12.4}
        handicapLabel="12.4"
        firstName="Test"
        onHandicapClick={() => {}}
      />
      <ProfileHeroBanner
        initials={initialsOf(null, "G")}
        handicapIndex={null}
        handicapLabel="—"
        firstName="there"
      />
    </>
  );
}
