/**
 * Presence channel subscription (G3.2).
 *
 * - Subscribes to `channelForUser(userId)` via the shared socket.
 * - `presence.updated` payloads go through `parsePresence` + `upsertPresence`
 *   (invalid payloads only warn, never crash the subscriber).
 * - Connection lifecycle stays in `RealtimeProvider`; this only subscribes.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { parsePresence, upsertPresence } from "@/entities/conversation";
import { channelForUser } from "@/shared/realtime/channels";
import { useChannel } from "@/shared/realtime/use-channel";

export function usePresenceChannel(userId: string | null): void {
  const qc = useQueryClient();

  const handleEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      if (event.type !== "presence.updated") return;
      if (!userId) return;
      const parsed = parsePresence(event.payload);
      if (!parsed) return;
      upsertPresence(qc, parsed);
    },
    [qc, userId],
  );

  useChannel(userId ? channelForUser(userId) : null, handleEvent);
}
