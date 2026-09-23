/**
 * Channel names + event types. Features subscribe to these, never raw strings.
 * Cache invalidation itself lives in `features/*` (e.g. feed), this only names the wire.
 */

export function channelForPost(id: string): string {
  return `post:${id}`;
}

export function channelForConversation(id: string): string {
  return `conversation:${id}`;
}

export function channelForUser(id: string): string {
  return `user:${id}`;
}

export function feedChannel(): string {
  return "feed:home";
}

export const REALTIME_EVENT_TYPES = [
  "post.updated",
  "post.deleted",
  "like.updated",
  "comment.added",
  "message.added",
  "notification.added",
] as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];

export function isKnownEventType(type: string): type is RealtimeEventType {
  return (REALTIME_EVENT_TYPES as readonly string[]).includes(type);
}
