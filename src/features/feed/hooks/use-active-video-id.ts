/**
 * Single-active-video selector (F7a).
 *
 * Pure function so the "never autoplay many" policy is unit-testable
 * without a native player. The feed passes FlashList viewable ids in
 * order; the first video wins. Non-video ids are ignored.
 */

export type FeedMediaKind = "image" | "video" | "none";

export function pickActiveVideoId(
  viewableIds: string[],
  kindById: ReadonlyMap<string, FeedMediaKind>,
): string | null {
  for (const id of viewableIds) {
    if (kindById.get(id) === "video") {
      return id;
    }
  }
  return null;
}
