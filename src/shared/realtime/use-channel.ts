/**
 * Subscribe to one realtime channel for the life of a component.
 * Connection lifecycle is owned elsewhere (connect after login);
 * this hook only manages the subscription. `null` channel unsubscribes.
 */

import { useEffect, useRef } from "react";

import { realtimeSocket, type RealtimeHandler } from "./socket";

export function useChannel(channel: string | null, onEvent: RealtimeHandler): void {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!channel) return;
    return realtimeSocket.subscribe(channel, (event) => handlerRef.current(event));
  }, [channel]);
}
