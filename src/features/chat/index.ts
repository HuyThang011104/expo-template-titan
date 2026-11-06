// Public API for `features/chat`.
// Routes must import from here only — no deep imports.
export { ChatDetailScreen } from "./screens/chat-detail-screen";
export { ChatListScreen } from "./screens/chat-list-screen";
export { useChatList, type ChatListFetchOptions } from "./queries/use-conversations";
export { useChatThread, type ChatThreadFetchOptions } from "./queries/use-chat-thread";
export { useChatSend, type ChatSendFetchOptions, type ChatSendInput, type ChatSendResult } from "./mutations/use-chat-send";
export {
  buildChatSendPayload,
  CHAT_OUTBOX_KIND,
  dispatchChatOutboxJob,
  handleChatSendJob,
  parseChatSendPayload,
  type ChatOutboxJob,
  type ChatSenderOptions,
  type ChatSendOutboxPayload,
} from "./outbox-sender";
export { chatDraftKey, useChatDraft } from "./hooks/use-chat-draft";
export { useChatImage } from "./hooks/use-chat-image";
export { useConversationChannel } from "./realtime/use-conversation-channel";
export { usePresenceChannel } from "./realtime/use-presence-channel";
export { useSendTyping } from "./realtime/use-send-typing";
export { CHAT_IMAGE_MAX_BYTES, validateChatImage, type ChatImageValidation } from "./validation";
export { ConversationList, type ConversationListProps } from "./components/conversation-list";
export { ConversationRow, type ConversationRowProps } from "./components/conversation-row";
export { MessageList, type MessageListProps } from "./components/message-list";
export { MessageBubble, type MessageBubbleProps } from "./components/message-bubble";
export { ChatComposer, type ChatComposerProps } from "./components/chat-composer";
export { TypingIndicator, type TypingIndicatorProps } from "./components/typing-indicator";
export { PresenceDot, type PresenceDotProps } from "./components/presence-dot";
export { logChatOpenList, logChatOpenThread, logChatSend } from "./analytics";
