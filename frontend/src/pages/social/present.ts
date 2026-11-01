import type { FriendshipAnswer, FriendshipStatus, Person } from "@/data/friendsModel";

/** Wording for the social pages. */

export function personName(person: Person): string {
  return person.name || "Unknown user";
}

/** The avatar falls back to "?" rather than spelling out "Unknown user". */
export function personInitials(person: Person): string | undefined {
  return person.name ? undefined : "?";
}

export function personDetail(person: Person): string {
  return person.email ?? "No email";
}

export function updatedLabel(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Updated ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
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
