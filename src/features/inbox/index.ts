// Public API for `features/inbox`.
// Routes must import from here only — no deep imports.
// Inbox is F5 notifications; chat lives in `features/chat` (F4).
export { InboxScreen } from "./screens/inbox-screen";
export { useInbox, type InboxFetchOptions } from "./queries/use-inbox";
