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

export type Message = {
  id: MessageId;
  conversationId: ConversationId;
  senderId: string;
  body: string;
  createdAt: string;
};
