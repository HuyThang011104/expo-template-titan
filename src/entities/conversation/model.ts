/**
 * Conversation + Message models (F4).
 *
 * Entity imports shared only, so participant ids stay plain strings.
 */

export type ConversationId = string;
export type MessageId = string;

export type Conversation = {
  id: ConversationId;
  title: string;
  participantIds: string[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type MessageStatus = "sending" | "sent" | "seen";

/**
 * G3.2 presence: one entry per user. `typingInConversationId` is the
 * conversation being typed in (null = idle); `typingExpiresAt` auto-clears
 * the indicator a few seconds after the peer stops (stale entries read as idle).
 */
export type Presence = {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
  typingInConversationId: string | null;
  typingExpiresAt: string | null;
};

/** G3.2: typing indicator lives ~5s after the last keystroke. */
export const TYPING_TTL_MS = 5_000;

export type Message = {
  id: MessageId;
  conversationId: ConversationId;
  senderId: string;
  body: string;
  /** Remote image url; `null` for text-only. Local `file://` only lives on the optimistic temp. */
  imageUrl: string | null;
  /** G3.1: `sending` (Đang gửi) -> `sent` (Đã gửi) -> `seen` (Đã xem). */
  status: MessageStatus;
  createdAt: string;
};
