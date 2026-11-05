import { FriendCodeSection } from "../components/FriendCodeSection";

export default function FriendCodeSectionPreview() {
  return (
    <div className="flex flex-col gap-4">
      <FriendCodeSection friendCode="BIRD-1234" />
      <FriendCodeSection friendCode={null} />
    </div>
  );
}
