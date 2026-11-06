/**
 * Throttled typing sender (G3.2).
 *
 * - `sendTyping` emits `typing.started` at most once per 2.5s while the
 *   local user keeps typing; `stopTyping` emits `typing.stopped` once.
 * - A silence timer auto-emits `typing.stopped` ~3s after the last keystroke
 *   so a backgrounded app never leaves a stuck `Đang nhập...`.
 * - Best-effort: socket closed -> send returns false, no throw, no retry.
 */

import { useCallback, useEffect, useRef } from "react";

import { channelForConversation } from "@/shared/realtime/channels";
import { realtimeSocket } from "@/shared/realtime/socket";

const SEND_THROTTLE_MS = 2_500;
const STOP_AFTER_SILENCE_MS = 3_000;

export function useSendTyping(conversationId: string | null): {
  sendTyping: () => void;
  stopTyping: () => void;
} {
  const lastSentRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const convRef = useRef(conversationId);

  useEffect(() => {
    convRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current !== undefined) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = undefined;
      }
    };
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== undefined) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = undefined;
    }
  }, []);

  const stopTyping = useCallback(() => {
    const conv = convRef.current;
    clearStopTimer();
    if (!conv) return;
    lastSentRef.current = 0;
    realtimeSocket.send("typing.stopped", channelForConversation(conv), {
      conversationId: conv,
      userId: "me",
    });
  }, [clearStopTimer]);

  const sendTyping = useCallback(() => {
    const conv = convRef.current;
    if (!conv) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_THROTTLE_MS) {
      // Still within the throttle window: just push the auto-stop out.
      clearStopTimer();
      stopTimerRef.current = setTimeout(() => {
        stopTimerRef.current = undefined;
        lastSentRef.current = 0;
        const current = convRef.current;
        if (!current) return;
        realtimeSocket.send("typing.stopped", channelForConversation(current), {
          conversationId: current,
          userId: "me",
        });
      }, STOP_AFTER_SILENCE_MS);
      return;
    }
    lastSentRef.current = now;
    realtimeSocket.send("typing.started", channelForConversation(conv), {
      conversationId: conv,
      userId: "me",
    });
    clearStopTimer();
    stopTimerRef.current = setTimeout(() => {
      stopTimerRef.current = undefined;
      lastSentRef.current = 0;
      const current = convRef.current;
      if (!current) return;
      realtimeSocket.send("typing.stopped", channelForConversation(current), {
        conversationId: current,
        userId: "me",
      });
    }, STOP_AFTER_SILENCE_MS);
  }, [clearStopTimer]);

  return { sendTyping, stopTyping };
}
