import { createContext, useMemo, type ReactNode } from "react";

import { clearDeactivated } from "../account/deactivation";
import { useStorageState } from "./use-storage-state";
import { SplashScreenController } from "./splash-screen-controller";

/**
 * Mock session, persisted via `useStorageState(SESSION_KEY)`.
 * `signIn` sets a fake `'dev-token'` and re-opens a deactivated account
 * (G2.4: "login lại mở").
 * TODO: replace with a real API + refresh tokens.
 */

export const SESSION_KEY = "session";

const MOCK_DEV_TOKEN = "dev-token";

export type SessionContextValue = {
  session: string | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [[isLoading, session], setSession] = useStorageState(SESSION_KEY);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      signIn: () => {
        clearDeactivated();
        setSession(MOCK_DEV_TOKEN);
      },
      signOut: () => {
        setSession(null);
      },
    }),
    [session, isLoading, setSession],
  );

  return (
    <SessionContext.Provider value={value}>
      <SplashScreenController onReady={!isLoading} />
      {children}
    </SessionContext.Provider>
  );
}
