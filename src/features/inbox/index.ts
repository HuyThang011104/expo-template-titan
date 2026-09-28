// Public API for `features/inbox`.
// Routes must import from here only — no deep imports.
// Chat screens stay placeholders (F4 skipped); inbox is F5 notifications.
export { ChatDetailScreen } from "./screens/chat-detail-screen";
export { ChatListScreen } from "./screens/chat-list-screen";
export { InboxScreen } from "./screens/inbox-screen";
export { useInbox, type InboxFetchOptions } from "./queries/use-inbox";
