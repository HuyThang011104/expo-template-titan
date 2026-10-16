import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import type { Href } from "expo-router";

import { logger } from "../observability/logger";
import { chatPath, hrefs, postPath } from "../navigation";

/**
 * Notification tap -> deep link handlers.
 * Supports `{ type: "post", id }` and G3.3 `{ type: "message" | "chat",
 * id | conversationId | convId }`, plus a `data.url` fallback path.
 * Queues the href when logged out and flushes after login.
 */

export function parsePostNotificationTarget(data: unknown): string | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;

  const type = record["type"];
  const id = record["id"];
  if (type === "post" && typeof id === "string" && id.trim() !== "") {
    return id;
  }

  const url = record["url"];
  if (typeof url === "string") {
    const match = /^\/(?:post|p)\/([^/?#]+)/.exec(url.trim());
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * G3.3: message pushes open the exact thread (`chats/[id]`).
 * Accepts `{ type: "message" | "chat", id | conversationId | convId }`
 * plus a `data.url` fallback (`/chat(s)/<id>`, `/c/<id>`).
 */
export function parseChatNotificationTarget(data: unknown): string | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;

  const type = record["type"];
  if (type === "message" || type === "chat") {
    const id = record["id"] ?? record["conversationId"] ?? record["convId"];
    if (typeof id === "string" && id.trim() !== "") {
      return id;
    }
    return null;
  }

  const url = record["url"];
  if (typeof url === "string") {
    const match = /^\/(?:chat|chats|c)\/([^/?#]+)/.exec(url.trim());
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

export function resolveNotificationHref(data: unknown): Href | null {
  const chatId = parseChatNotificationTarget(data);
  if (chatId) return hrefs.chat(chatId);
  const id = parsePostNotificationTarget(data);
  return id ? hrefs.post(id) : null;
}

let pendingHref: Href | null = null;

/** Reads and clears the pending deep link (consumed once the session exists). */
export function consumePendingNotificationHref(): Href | null {
  const href = pendingHref;
  pendingHref = null;
  return href;
}

/**
 * Navigates from notification data. Returns `true` when the payload is handled.
 */
export function navigateFromNotificationData(
  data: unknown,
  options: { authenticated: boolean },
): boolean {
  const href = resolveNotificationHref(data);
  if (!href) return false;
  if (!options.authenticated) {
    pendingHref = href;
    const chatId = parseChatNotificationTarget(data);
    logger.info("[notifications] queued deep link until login", {
      path: chatId ? chatPath(chatId) : postPath(parsePostNotificationTarget(data) ?? ""),
    });
    return true;
  }
  try {
    router.push(href);
    return true;
  } catch {
    logger.warn("[notifications] router.push from notification failed");
    return false;
  }
}

/** Foreground presentation: banner + list, no sound/badge. Called once from bootstrap. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Observes notification taps (incl. cold start) and flushes the queue on login. */
export function useNotificationObserver(session: string | null): void {
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        navigateFromNotificationData(response.notification.request.content.data, {
          authenticated: sessionRef.current !== null,
        });
      })
      .catch(() => {
        // Cold-start lookup must never crash the app.
      });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationData(response.notification.request.content.data, {
        authenticated: sessionRef.current !== null,
      });
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (session === null) return;
    const href = consumePendingNotificationHref();
    if (!href) return;
    try {
      router.push(href);
    } catch {
      logger.warn("[notifications] flush queued deep link failed");
    }
  }, [session]);
}
