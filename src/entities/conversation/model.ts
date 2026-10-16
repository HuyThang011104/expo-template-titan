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
