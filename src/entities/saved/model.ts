/**
 * Saved posts model — plain types (G1.4).
 *
 * The saved list is a per-viewer set of post ids. Wire items duplicate the
 * `{ post, author }` shape on purpose (entity-to-entity imports are banned —
 * same rule as `FeedWireItem`).
 */

export type SavedPostWireItem = {
  post: {
    id: string;
    authorId: string;
    body: string;
    media: { kind: "image" | "video"; url: string }[];
    likeCount: number;
    likedByMe: boolean;
    createdAt: string;
  };
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
};
