/**
 * Minimal Conversation + Message fixtures (F4).
 * Not exported via `index.ts`.
 */

import type { Conversation, Message } from "./model";

export const mockConversation1: Conversation = {
  id: "c-1",
  title: "Ava Stone",
  participantIds: ["u-1"],
  lastMessagePreview: "See you tomorrow",
  lastMessageAt: "2026-09-09T10:00:00.000Z",
  unreadCount: 2,
};

export const mockConversation2: Conversation = {
  id: "c-2",
  title: "Liam Carter",
  participantIds: ["u-2"],
  lastMessagePreview: "Nice post!",
  lastMessageAt: "2026-09-08T08:30:00.000Z",
  unreadCount: 0,
};

export const mockMessage1: Message = {
  id: "m-1",
  conversationId: "c-1",
  senderId: "u-1",
  body: "Hey, how is it going?",
  imageUrl: null,
  status: "seen",
  createdAt: "2026-09-09T09:58:00.000Z",
};

export const mockMessage2: Message = {
  id: "m-2",
  conversationId: "c-1",
  senderId: "me",
  body: "All good, see you tomorrow",
  imageUrl: null,
  status: "sent",
  createdAt: "2026-09-09T10:00:00.000Z",
};

export const mockImageMessage: Message = {
  id: "m-img-1",
  conversationId: "c-1",
  senderId: "me",
  body: "",
  imageUrl: "https://picsum.photos/seed/chat-img-1/800/600",
  status: "sent",
  createdAt: "2026-09-09T10:01:00.000Z",
};
