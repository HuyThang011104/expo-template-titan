/**
 * Dumb post card.
 *
 * Takes `postId` and reads the canonical `usePost` + `usePostAuthor`.
 * Renders the author header inline to respect the boundary.
 */

import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { formatRelative } from "@/shared/lib/date";
import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

import { usePost, usePostAuthor } from "../queries";
import { PostActions } from "./post-actions";

export type PostCardProps = {
  postId: string;
  testID?: string;
};

const AUTHOR_AVATAR_SIZE = 40;
const POST_IMAGE_HEIGHT = 200;

function PostAuthorHeader({ authorId }: { authorId: string }) {
  const theme = useTheme();
  const authorQuery = usePostAuthor(authorId);

  if (authorQuery.isPending) {
    return (
      <View style={styles.authorRow}>
        <View
          style={[
            styles.authorAvatar,
            {
              backgroundColor: theme.color.backgroundElement,
              borderRadius: theme.radius.full,
            },
          ]}
        />
      </View>
    );
  }

  const author = authorQuery.data;
  if (!author) {
    return (
      <Text variant="small" color="textSecondary">
        Unknown user
      </Text>
    );
  }

  const shape = {
    width: AUTHOR_AVATAR_SIZE,
    height: AUTHOR_AVATAR_SIZE,
    borderRadius: theme.radius.full,
  };
  return (
    <View style={styles.authorRow}>
      {author.avatarUrl ? (
        <Image
          source={{ uri: author.avatarUrl }}
          style={shape}
          contentFit="cover"
          transition={200}
          accessibilityLabel={author.displayName}
        />
      ) : (
        <View
          style={[shape, styles.authorFallback, { backgroundColor: theme.color.backgroundElement }]}
          accessibilityRole="image"
          accessibilityLabel={author.displayName}
        >
          <Text variant="small" color="textSecondary" style={styles.authorInitial}>
            {(author.displayName.trim().slice(0, 1) || "?").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.authorNames}>
        <Text variant="small" style={styles.authorName}>
          {author.displayName}
        </Text>
        <Text variant="caption" color="textSecondary">
          @{author.handle}
        </Text>
      </View>
    </View>
  );
}

export function PostCard({ postId, testID }: PostCardProps) {
  const theme = useTheme();
  const postQuery = usePost(postId);

  if (postQuery.isPending) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Loading…
      </Text>
    );
  }

  const post = postQuery.data;
  if (postQuery.isError || !post) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Post unavailable
      </Text>
    );
  }

  const firstMedia = post.media[0];
  return (
    <View testID={testID} style={[styles.card, { gap: theme.space.sm }]}>
      <PostAuthorHeader authorId={post.authorId} />
      <Text variant="body">{post.body}</Text>
      {firstMedia?.kind === "image" ? (
        <Image
          source={{ uri: firstMedia.url }}
          style={[styles.postImage, { borderRadius: theme.radius.md }]}
          contentFit="cover"
          transition={200}
        />
      ) : firstMedia?.kind === "video" ? (
        <View
          style={[
            styles.videoPlaceholder,
            {
              backgroundColor: theme.color.backgroundElement,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text variant="small" color="textSecondary">
            Video
          </Text>
        </View>
      ) : null}
      <PostActions postId={postId} testID={`like-button-${postId}`} />
      <Text variant="caption" color="textSecondary">
        {formatRelative(post.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: AUTHOR_AVATAR_SIZE,
    height: AUTHOR_AVATAR_SIZE,
  },
  authorFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontWeight: "700",
  },
  authorNames: {
    marginLeft: 12,
    justifyContent: "center",
  },
  authorName: {
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    height: POST_IMAGE_HEIGHT,
  },
  videoPlaceholder: {
    width: "100%",
    height: POST_IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
