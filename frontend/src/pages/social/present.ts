import { formatDayShort } from "@/domain";
import { formatHandicapIndex } from "@/domain/handicap";
import type { FriendshipAnswer, FriendshipStatus, Person } from "@/data/friendsModel";

export function personName(person: Person): string {
  return person.name || "Unknown user";
}

export function personInitials(person: Person): string | undefined {
  return person.name ? undefined : "?";
}

export function friendDetail(person: Person): string {
  const index = person.handicapIndex != null ? `Handicap ${formatHandicapIndex(person.handicapIndex)}` : null;
  const played = formatDayShort(person.lastPlayed);
  if (index && played) return `${index} · played ${played}`;
  if (index) return index;
  if (played) return `Played ${played}`;
  return "No rounds yet";
}

export function requestDetail(updatedAt: string | null): string | null {
  return formatDayShort(updatedAt);
}

export function compareLink(friendId: string): string {
  return `/analytics?tab=profile&friend=${encodeURIComponent(friendId)}`;
}

export function requestsLabel(open: number): string {
  return open > 0 ? `Requests, ${open} new` : "Requests";
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
