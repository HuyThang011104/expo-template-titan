import { useLocalSearchParams } from "expo-router";

import { PostCard } from "@/entities/post";
import { Screen, Text } from "@/shared/ui";

/**
 * Post detail screen (`/post/[id]`) — renders `PostCard(postId)` from the canonical cache.
 * Unknown ids show a fallback, never a crash.
 */
export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return (
      <Screen>
        <Text variant="body">Missing post id.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <PostCard postId={id} />
    </Screen>
  );
}
