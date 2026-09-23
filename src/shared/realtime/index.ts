// Public API of `src/shared/realtime`. No deep imports.
export {
  RealtimeSocket,
  parseMessage,
  realtimeSocket,
  type RealtimeEvent,
  type RealtimeHandler,
  type SocketDeps,
  type SocketState,
} from "./socket";
export {
  REALTIME_EVENT_TYPES,
  channelForConversation,
  channelForPost,
  channelForUser,
  feedChannel,
  isKnownEventType,
  type RealtimeEventType,
} from "./channels";
export { useChannel } from "./use-channel";
export { RealtimeProvider } from "./realtime-provider";
