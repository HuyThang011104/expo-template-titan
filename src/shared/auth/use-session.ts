import { useContext } from "react";

import { SessionContext, type SessionContextValue } from "./session-provider";

/** Reads the session. Throws outside `<SessionProvider />`. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }
  return value;
}
