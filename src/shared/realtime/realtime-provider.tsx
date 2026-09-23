/**
 * Lifecycle owner for the realtime socket. Mount inside `<SessionProvider />` —
 * it reads `useSession()` and connects only while logged in.
 *
 * ASSUMPTIONS (explicit until the backend contract lands):
 * - Auth is `?token=<session>` on the WS URL; token refresh mid-connection is
 *   NOT handled — a reconnect (logout/login) picks up the fresh token.
 * - The server speaks `{ channel, type, payload }` JSON (see `parseMessage`).
 *   No message acks, no heartbeat replies expected.
 * - One connection per app. Features share it via `useChannel()` / `realtimeSocket`.
 * - Offline behavior rides on socket backoff, not on NetInfo — the socket
 *   retries with capped exponential backoff until the server is reachable.
 */

import type { ReactNode } from "react";
import { useEffect } from "react";

import { useSession } from "../auth";
import { realtimeSocket } from "./socket";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      realtimeSocket.connect();
    } else {
      realtimeSocket.disconnect();
    }
  }, [session, isLoading]);

  useEffect(() => {
    return () => {
      realtimeSocket.disconnect();
    };
  }, []);

  return <>{children}</>;
}
