import { Button, Screen, Text } from "@/shared/ui";
import { isObservabilityEnabled, logger } from "@/shared/observability";

declare const __DEV__: boolean;

/**
 * Hidden dev screen for verifying crash reporting.
 *
 * - Not linked from any tab or stack — open via deep link or direct push.
 * - The test button throws on purpose; without a DSN it only logs.
 * - Shows the enabled/disabled state on screen for QA.
 */
export function DevCrashScreen() {
  const enabled = isObservabilityEnabled();
  const dev = typeof __DEV__ !== "undefined" && __DEV__;

  return (
    <Screen>
      <Text variant="title">Observability test</Text>
      <Text variant="body">
        {enabled
          ? "Sentry enabled — test errors go to the dashboard."
          : "Sentry disabled (no DSN) — test errors only log \u201Cwould send\u201D."}
      </Text>
      {dev ? (
        <Button
          title="Throw test error"
          onPress={() => {
            logger.error("[dev-crash] intentional test error");
            throw new Error("Hello, again, Sentry! (dev-crash test)");
          }}
        />
      ) : null}
    </Screen>
  );
}
