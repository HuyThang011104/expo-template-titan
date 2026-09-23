import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import "@/global.css";
import { AppProviders } from "@/app-providers";
import { useSession } from "@/shared/auth";
import { captureError } from "@/shared/observability";
import { ErrorScreen } from "@/shared/ui";

SplashScreen.preventAutoHideAsync();

// TODO: branded splash — SplashScreenController currently keeps the splash
// until session hydrate to avoid a double-hide race.

/**
 * Root layout: composes providers + Protected navigator.
 * No `router.replace` here — `Stack.Protected` redirects itself.
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
        {/* Modals + shared exist only when logged in. */}
        <Stack.Screen name="(modals)" />
        <Stack.Screen name="(shared)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Root route boundary (Expo Router convention: named `ErrorBoundary` export,
 * NOT a `+error.tsx` file). Catches provider/auth crashes; screens below
 * may narrow it further. Reports once per error, retry re-renders the route.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureError(error, { route: "root" });
  }, [error]);

  return (
    <ErrorScreen
      error={error}
      onRetry={() => {
        void retry();
      }}
    />
  );
}
