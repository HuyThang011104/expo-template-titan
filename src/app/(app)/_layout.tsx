import { router, type ErrorBoundaryProps } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";

import { useInbox } from "@/features/inbox";
import { captureError } from "@/shared/observability";
import { ErrorScreen } from "@/shared/ui";

function unreadLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

/**
 * Native tabs root with 5 tabs.
 * Create is `disabled` (blocks the native switch, still emits `tabPress`);
 * the listener pushes the composer sheet. Its route lives at `/create` so it
 * can never win the `/` match over `(home)` on cold start.
 * The inbox badge reads the same entity-backed count as the Inbox screen; the
 * whole layout unmounts on logout, so no fetch happens without a session.
 */
export default function AppTabsLayout() {
  const badge = unreadLabel(useInbox().unreadCount);

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md={{ default: "home", selected: "home_filled" }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(create)"
        disabled
        listeners={{
          tabPress: () => {
            router.push("/composer");
          },
        }}
      >
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(inbox)">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
        {badge ? <NativeTabs.Trigger.Badge>{badge}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/**
 * Tab-scope boundary: a crashing screen falls back here while the native
 * tab bar stays mounted, so users can switch tabs instead of relogging.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureError(error, { route: "(app)" });
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
