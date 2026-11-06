import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as RouterThemeProvider } from "expo-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { CHAT_OUTBOX_KIND, dispatchChatOutboxJob } from "@/features/chat";
import { COMPOSER_OUTBOX_KIND, dispatchComposerOutboxJob } from "@/features/composer";
import { logger } from "@/shared/observability/logger";
import { SessionProvider } from "@/shared/auth";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { NotificationsBootstrap } from "@/shared/notifications";
import { ObservabilityBootstrap, initObservability } from "@/shared/observability";
import { queryClient, setupOnlineManager, startQueryPersistence } from "@/shared/query";
import { RealtimeProvider } from "@/shared/realtime";
import { startOutboxSync } from "@/shared/storage/db/outbox-worker";
import { OfflineBanner, ThemePreferenceProvider, ThemeProvider, useTheme } from "@/shared/ui";
import { navigationTheme } from "@/shared/ui/navigation/navigation-theme";

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
 * Outer `LocaleProvider` (G2.4 vi/en override) + `ThemePreferenceProvider`
 * (G2.4 sáng/tối), then `ThemeProvider` (design tokens), then the router
 * ThemeProvider (follows the app theme), then `QueryClientProvider`
 * (server state), innermost `SessionProvider` (auth gate + splash controller).
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
/**
 * Router theme follows the app theme (G2.4: explicit sáng/tối wins over the
 * system scheme, so nav chrome matches the app).
 */
function ThemedRouter({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <RouterThemeProvider value={navigationTheme(theme)}>{children}</RouterThemeProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {

  useEffect(() => setupOnlineManager(), []);
  // Offline mutation queue (F1.3 composer `post.create`, G3.3 chat `chat.send`):
  // drains once when online + on every offline->online transition. Unknown
  // kinds are dropped inside the dispatchers so they never head-of-line
  // block the queue. App-level routing keeps features decoupled
  // (feature-to-feature imports stay forbidden).
  useEffect(() => {
    const stop = startOutboxSync(async (job) => {
      if (job.kind === COMPOSER_OUTBOX_KIND) return dispatchComposerOutboxJob(job);
      if (job.kind === CHAT_OUTBOX_KIND) return dispatchChatOutboxJob(job);
      logger.warn("[outbox] unknown kind, dropping", { kind: job.kind });
    });
    return stop;
  }, []);
  // Background cache restore (identity/profile keys only) + throttled writes.
  // Best-effort: never blocks first paint, failures only warn.
  useEffect(() => {
    startQueryPersistence();
  }, []);

  return (
    <LocaleProvider>
      <ThemePreferenceProvider>
        <ThemeProvider>
          {/* Gestures need a root view; harmless on web, required on native. */}
          <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardScope>
            <ThemedRouter>
              <QueryClientProvider client={queryClient}>
                <SessionProvider>
                  <RealtimeProvider>
                    <NotificationsBootstrap />
                    <ObservabilityBootstrap />
                    {/* App-scope: never unmounts with a screen, never blocks cache. */}
                    <OfflineBanner />
                    {children}
                  </RealtimeProvider>
                </SessionProvider>
              </QueryClientProvider>
            </ThemedRouter>
          </KeyboardScope>
          </GestureHandlerRootView>
        </ThemeProvider>
      </ThemePreferenceProvider>
    </LocaleProvider>
  );
}
