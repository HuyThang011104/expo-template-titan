/**
 * Single app-wide WebSocket connection. Connect after login only
 * (future `RealtimeProvider` owns that); features subscribe via `useChannel`.
 *
 * - Bearer rides the `?token=` query param, read from `secure.ts` at connect time.
 * - Exponential backoff with a cap, 25s heartbeat ping, manual close stops retries.
 * - Never throws to subscribers; failures are logged with channel/type only.
 */

import { SESSION_KEY } from "../auth";
import { realtimeUrl } from "../api/endpoints";
import { logger } from "../observability/logger";
import { getSecureItem } from "../storage/secure";

export type RealtimeEvent = {
  channel: string;
  type: string;
  payload: unknown;
};

export type RealtimeHandler = (event: RealtimeEvent) => void;

export type SocketState = "idle" | "connecting" | "open" | "backoff" | "closed";

export type SocketDeps = {
  /** Injected for tests. Defaults to the global `WebSocket`. */
  createSocket?: (url: string) => WebSocket;
  getToken?: () => Promise<string | null>;
};

const HEARTBEAT_MS = 25_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

function backoffDelayMs(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
}

export function parseMessage(data: unknown): RealtimeEvent | null {
  let parsed: unknown = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const { channel, type, payload } = parsed as { channel?: unknown; type?: unknown; payload?: unknown };
  if (typeof channel !== "string" || typeof type !== "string") return null;
  return { channel, type, payload };
}

export class RealtimeSocket {
  state: SocketState = "idle";

  private socket: WebSocket | null = null;
  private handlers = new Map<string, Set<RealtimeHandler>>();
  private manualClose = false;
  private attempts = 0;
  private heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
  private backoffTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: SocketDeps = {}) {}

  /** Open (or re-open) the connection. Safe to call when already open. */
  connect(): void {
    if (this.socket) return;
    this.manualClose = false;
    this.state = "connecting";
    void this.open();
  }

  /** Manual close. Clears timers and stops backoff. */
  disconnect(): void {
    this.manualClose = true;
    this.clearTimers();
    try {
      this.socket?.close();
    } catch {
      // Already gone — nothing to clean up.
    }
    this.socket = null;
    this.state = "closed";
  }

  /** Subscribe to one channel (`"*"` receives everything). Returns an unsubscribe fn. */
  subscribe(channel: string, handler: RealtimeHandler): () => void {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
    }
    set.add(handler);
    return () => {
      const current = this.handlers.get(channel);
      current?.delete(handler);
      if (current?.size === 0) this.handlers.delete(channel);
    };
  }

  /** Best-effort send. Returns `false` when the socket is not open. */
  send(type: string, channel: string, payload: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(JSON.stringify({ type, channel, payload }));
      return true;
    } catch {
      logger.warn("[realtime] send failed", { channel, type });
      return false;
    }
  }

  private async open(): Promise<void> {
    if (this.manualClose || this.socket) return;
    const getToken = this.deps.getToken ?? (() => getSecureItem(SESSION_KEY));
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      logger.warn("[realtime] getToken failed, connecting unauthenticated");
    }
    if (this.manualClose || this.socket) return;

    const url = token ? `${realtimeUrl()}?token=${encodeURIComponent(token)}` : realtimeUrl();
    const create = this.deps.createSocket ?? ((socketUrl: string) => new WebSocket(socketUrl));
    let socket: WebSocket;
    try {
      socket = create(url);
    } catch {
      logger.warn("[realtime] socket create failed");
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => this.handleOpen();
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onclose = () => this.handleClose();
    socket.onerror = () => {
      logger.warn("[realtime] socket error");
    };
  }

  private handleOpen(): void {
    this.state = "open";
    this.attempts = 0;
    this.startHeartbeat();
  }

  private handleMessage(data: unknown): void {
    const event = parseMessage(data);
    if (!event) return;
    this.handlers.get(event.channel)?.forEach((handler) => handler(event));
    if (event.channel !== "*") {
      this.handlers.get("*")?.forEach((handler) => handler(event));
    }
  }

  private handleClose(): void {
    this.socket = null;
    this.clearTimers();
    if (this.manualClose) {
      this.state = "closed";
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    this.state = "backoff";
    const delay = backoffDelayMs(this.attempts);
    this.attempts += 1;
    this.clearBackoff();
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = undefined;
      if (this.manualClose) return;
      this.state = "connecting";
      void this.open();
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = undefined;
      if (!this.send("ping", "*", null)) return;
      this.startHeartbeat();
    }, HEARTBEAT_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private clearBackoff(): void {
    if (this.backoffTimer !== undefined) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = undefined;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    this.clearBackoff();
  }
}

/** App singleton. Features never construct their own socket. */
export const realtimeSocket = new RealtimeSocket();
