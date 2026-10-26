import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * `(shared)` group — post/user detail, settings stack, dev-only screens,
 * pushed from the root stack. Native header + back everywhere except the
 * nested settings stack, which owns its own headers.
 */
export default function SharedGroupLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="post/[id]" options={headerOptions(theme, { title: "Post" })} />
      <Stack.Screen
        name="user/[handle]"
        options={({ route }) => {
          const params = route.params as { handle?: string } | undefined;
          return headerOptions(theme, { title: `@${params?.handle ?? ""}` });
        }}
      />
      <Stack.Screen
        name="user/[handle]/followers"
        options={headerOptions(theme, { title: "Followers" })}
      />
      <Stack.Screen
        name="user/[handle]/following"
        options={headerOptions(theme, { title: "Following" })}
      />
      <Stack.Screen
        name="hashtag/[tag]"
        options={({ route }) => {
          const params = route.params as { tag?: string } | undefined;
          return headerOptions(theme, { title: `#${params?.tag ?? ""}` });
        }}
      />
      <Stack.Screen
        name="follow-requests"
        options={headerOptions(theme, { title: "Follow requests" })}
      />
      <Stack.Screen name="dev-crash" options={headerOptions(theme, { title: "Dev crash" })} />
      <Stack.Screen name="showcase" options={headerOptions(theme, { title: "Showcase" })} />
      {/* Settings is its own stack with its own headers. */}
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}
