import { formatDayShort } from "@/domain";
import { formatHandicapIndex } from "@/domain/handicap";
import type { FriendshipAnswer, FriendshipStatus, Person } from "@/data/friendsModel";

/** Wording for the social pages. */

export function personName(person: Person): string {
  return person.name || "Unknown user";
}

/** The avatar falls back to "?" rather than spelling out "Unknown user". */
export function personInitials(person: Person): string | undefined {
  return person.name ? undefined : "?";
}

/** A friend's line: "Handicap 8.2 · played Oct 28", what of it there is, or "No rounds yet". */
export function friendDetail(person: Person): string {
  const index = person.handicapIndex != null ? `Handicap ${formatHandicapIndex(person.handicapIndex)}` : null;
  const played = formatDayShort(person.lastPlayed);
  if (index && played) return `${index} · played ${played}`;
  if (index) return index;
  if (played) return `Played ${played}`;
  return "No rounds yet";
}

/** A request's line: the day it was sent or last answered, "Oct 28". */
export function requestDetail(updatedAt: string | null): string | null {
  return formatDayShort(updatedAt);
}

/** Where Compare goes: Profile, set against this friend. */
export function compareLink(friendId: string): string {
  return `/analytics?tab=profile&friend=${encodeURIComponent(friendId)}`;
}

/** The Requests button as a screen reader hears it: "Requests, 1 new". */
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
