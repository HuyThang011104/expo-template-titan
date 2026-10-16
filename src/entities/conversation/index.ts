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
} from "./model";
// Parses wire payloads; raw zod schemas stay private.
export { parseConversation, parseMessage, parseSendMessageInput, type SendMessageInput } from "./schema";
export {
  fetchConversation,
  fetchConversationsPageWire,
  fetchMessagesPageWire,
  sendMessageRemote,
  type ConversationsPageWire,
  type FetchOptions as ConversationFetchOptions,
  type MessagesPageWire,
} from "./api";
export {
  getConversationData,
  getMessageData,
  hydrateConversation,
  hydrateMessage,
  markConversationRead,
  markMessagesSeen,
  previewForMessage,
  sendMessage,
  setConversation,
  setMessage,
  upsertIncomingMessage,
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
  useSendMessage,
  type ConversationsPage,
  type MessagesPage,
  type QueryFetchOptions as UseConversationOptions,
} from "./queries";
