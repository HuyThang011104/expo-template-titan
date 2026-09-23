import { useEffect, useRef } from "react";

import { useSession } from "../auth";
import { configureNotificationHandler, useNotificationObserver } from "./handlers";
import { registerForPushNotifications } from "./register";

/**
 * Push + notification deep link bootstrap, mounted once in `SessionProvider`.
 * Registers for push only while logged in, once per session. Renders null.
 */
export function NotificationsBootstrap() {
  const { session } = useSession();
  const registeredFor = useRef<string | null>(null);

  useNotificationObserver(session);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (session === null || registeredFor.current === session) return;
    registeredFor.current = session;
    void registerForPushNotifications().then((token) => {
      if (token === null) registeredFor.current = null;
    });
  }, [session]);

  return null;
}
