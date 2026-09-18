import { ProfileHeroBanner } from "../components/ProfileHeroBanner";
import { dashboardUser } from "@/testing/fixtures/dashboard";

export default function ProfileHeroBannerPreview() {
  return (
    <>
      <ProfileHeroBanner
        user={dashboardUser}
        handicapIndex={12.4}
        handicapLabel="12.4"
        firstName="Test"
        onHandicapClick={() => {}}
      />
      <ProfileHeroBanner
        user={{ ...dashboardUser, name: null }}
        handicapIndex={null}
        handicapLabel="—"
        firstName="there"
      />
    </>
  );
}
