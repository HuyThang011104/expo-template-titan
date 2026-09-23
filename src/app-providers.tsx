import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider as RouterThemeProvider } from "expo-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { SessionProvider } from "@/shared/auth";
import { NotificationsBootstrap } from "@/shared/notifications";
import { ObservabilityBootstrap, initObservability } from "@/shared/observability";
import { queryClient, setupOnlineManager, startQueryPersistence } from "@/shared/query";
import { RealtimeProvider } from "@/shared/realtime";
import { ThemeProvider } from "@/shared/ui";

type AppProvidersProps = {
  children: ReactNode;
};

// Early Sentry init: DSN comes from env, never hardcoded.
// Missing DSN/SDK means disabled logging — never throws, never blocks boot.
initObservability();

/**
 * Keyboard controller scope. Native only — the library is a no-op risk on web,
 * so web renders children straight through.
 */
function KeyboardScope({ children }: { children: ReactNode }) {
  if (process.env.EXPO_OS === "web") return <>{children}</>;
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

/**
 * Single provider tree.
 * Outer `ThemeProvider` (design tokens), then the router ThemeProvider,
 * then `QueryClientProvider` (server state),
 * innermost `SessionProvider` (auth gate + splash controller).
 * Query stays outside Session: auth middleware reads SecureStore directly,
 * so the order is safe and features can still use `useSession()` inside.
 * `NotificationsBootstrap` + `ObservabilityBootstrap` sit inside Session:
 * push asks permission only after login; observability attaches the
 * session user id (no PII) and flushes the screen breadcrumb.
 * `RealtimeProvider` also sits inside Session: socket connects only while
 * logged in (`?token=` assumption, see `shared/realtime/realtime-provider`).
 * Query persistence restores identity/profile cache in the background
 * (see `shared/query/persist`); first paint never waits for it.
 * Sentry inits early at module scope (env DSN, disabled when missing).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme();

  useEffect(() => setupOnlineManager(), []);
  // Background cache restore (identity/profile keys only) + throttled writes.
  // Best-effort: never blocks first paint, failures only warn.
  useEffect(() => {
    startQueryPersistence();
  }, []);

  return (
    <ThemeProvider>
      {/* Gestures need a root view; harmless on web, required on native. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardScope>
        <RouterThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <RealtimeProvider>
                <NotificationsBootstrap />
                <ObservabilityBootstrap />
                {children}
              </RealtimeProvider>
            </SessionProvider>
          </QueryClientProvider>
        </RouterThemeProvider>
      </KeyboardScope>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
