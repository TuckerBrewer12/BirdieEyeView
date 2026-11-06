import { formatDay } from "@/domain";
import type { FriendshipAnswer, FriendshipStatus, Person } from "@/data/friendsModel";

export function personName(person: Person): string {
  return person.name || "Unknown user";
}

export function personInitials(person: Person): string | undefined {
  return person.name ? undefined : "?";
}

export function personDetail(person: Person): string {
  return person.email ?? "No email";
}

export function updatedLabel(updatedAt: string | null): string | null {
  const day = formatDay(updatedAt);
  return day ? `Updated ${day}` : null;
}

export const STATUS_LABELS: Record<FriendshipStatus, string> = {
  pending: "Pending",
  accepted: "Friends",
  declined: "Declined",
  blocked: "Blocked",
};

export const ANSWERED_NOTICES: Record<FriendshipAnswer, string> = {
  accepted: "Request accepted.",
  declined: "Request declined.",
  blocked: "Request blocked.",
};
