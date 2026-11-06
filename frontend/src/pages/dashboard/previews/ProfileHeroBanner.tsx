import { ProfileHeroBanner } from "../components/ProfileHeroBanner";
import { initialsOf } from "../present";
import { dashboardUser } from "@/testing/fixtures/dashboard";

export default function ProfileHeroBannerPreview() {
  return (
    <>
      <ProfileHeroBanner
        initials={initialsOf(dashboardUser)}
        handicapIndex={12.4}
        handicapLabel="12.4"
        firstName="Test"
        onHandicapClick={() => {}}
      />
      <ProfileHeroBanner
        initials={initialsOf({ ...dashboardUser, name: null })}
        handicapIndex={null}
        handicapLabel="—"
        firstName="there"
      />
    </>
  );
}
