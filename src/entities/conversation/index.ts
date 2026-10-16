/**
 * Public API for `entities/conversation`.
 *
 * Outside code must import from here only — no deep imports.
 * All sends must go through `sendMessage`.
 * Does not export: raw schema, `__fixtures__`.
 */

export type {
  Conversation,
  ConversationId,
  Message,
  MessageId,
  MessageStatus,
  Presence,
} from "./model";
export { TYPING_TTL_MS } from "./model";
// Parses wire payloads; raw zod schemas stay private.
export {
  parseConversation,
  parseMessage,
  parseMessageSeenPayload,
  parsePresence,
  parseSendMessageInput,
  parseTypingPayload,
  type SendMessageInput,
} from "./schema";
export {
  fetchConversation,
  fetchConversationsPageWire,
  fetchMessagesPageWire,
  fetchPresence,
  markConversationReadRemote,
  sendMessageRemote,
  type ConversationsPageWire,
  type FetchOptions as ConversationFetchOptions,
  type MessagesPageWire,
} from "./api";
export {
  getConversationData,
  getMessageData,
  getPresenceData,
  hydrateConversation,
  hydrateMessage,
  isTypingIn,
  markConversationRead,
  markMessagesSeen,
  markThreadRead,
  previewForMessage,
  pruneExpiredTyping,
  sendMessage,
  setConversation,
  setMessage,
  setPresence,
  upsertIncomingMessage,
  upsertPresence,
  upsertTypingStarted,
  upsertTypingStopped,
  type ChatSendInput,
  type ConversationsPageShape,
  type MessagesPageShape,
  type SendMessageOptions,
  type SendMessageRemoteFn,
} from "./cache";
export {
  useConversation,
  useConversations,
  useHydrateMessage,
  useMessage,
  useMessages,
  usePresence,
  useSendMessage,
  useTypingIn,
  type ConversationsPage,
  type MessagesPage,
  type QueryFetchOptions as UseConversationOptions,
} from "./queries";
