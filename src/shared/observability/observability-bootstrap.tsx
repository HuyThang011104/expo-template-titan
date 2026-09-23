/**
 * Observability bootstrap, mounted once inside `SessionProvider`.
 * Syncs the stable user id with the session and renders `<ScreenTracking />`.
 */

import { useEffect } from "react";

import { useSession } from "../auth";
import { ScreenTracking } from "./screen-tracking";
import { mapSessionToUserId, setObservabilityUser } from "./sentry";

export function ObservabilityBootstrap() {
  const { session } = useSession();

  useEffect(() => {
    setObservabilityUser(mapSessionToUserId(session));
  }, [session]);

  return <ScreenTracking />;
}
