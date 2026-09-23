import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

/**
 * Keeps the native splash until the session hydrates. Mounts inside `SessionProvider`.
 */
export function SplashScreenController({ onReady }: { onReady: boolean }) {
  useEffect(() => {
    if (onReady) {
      SplashScreen.hideAsync().catch(() => {
        // Already hidden or never shown — never crash over this.
      });
    }
  }, [onReady]);

  return null;
}
