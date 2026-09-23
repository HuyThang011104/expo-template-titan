/**
 * Post model — plain types.
 *
 * Entity imports shared only, so `authorId` stays a plain
 * string and the wire `author` duplicates the User shape.
 */

export type PostId = string;

export type PostMediaKind = "image" | "video";

export type PostMedia = {
  kind: PostMediaKind;
  url: string;
};

export type Post = {
  id: PostId;
  /** UserId (string) — kept local to respect the boundary. */
  authorId: string;
  body: string;
  media: PostMedia[];
  likeCount: number;
  likedByMe: boolean;
  /** ISO datetime string. */
  createdAt: string;
};

/**
 * Feed item on the wire: `{ post, author }`.
 * `author` duplicates the User shape on purpose (entity-to-entity imports are banned).
 */
export type FeedWireItem = {
  post: Post;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
};
