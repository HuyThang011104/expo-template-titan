/**
 * Internal mock fetch with simulated latency and minimal fixtures.
 * Duplicates entity fixtures inline on purpose (`shared` never imports `entities`).
 * Returns real `Response` objects; opt in via `fetchImpl: createMockFetch()`.
 */

import { env } from "../config/env";
import type { HttpMethod } from "./client";

export type MockRequest = {
  method: HttpMethod;
  path: string;
  /** Raw body string from `client.ts`, or `null` when absent/non-string. */
  bodyText: string | null;
};

export type MockRoute = {
  method: HttpMethod;
  path: string;
  handler: (req: MockRequest) => unknown | Promise<unknown>;
  /** Defaults to 200; custom routes may force a status (e.g. 500). */
  status?: number;
};

export type MockFetchOptions = {
  delayMs?: number;
  /** Overrides all defaults. Omit to use the built-in routes. */
  routes?: MockRoute[];
};

const DEFAULT_DELAY_MS = 300;

/** Mirrors the user fixtures (kept in sync by hand; boundary forbids importing). */
const mockUsers = [
  {
    id: "u-1",
    handle: "ava",
    displayName: "Ava Stone",
    avatarUrl: "https://picsum.photos/seed/u1/200",
    bio: "Coffee + trail runs.",
    coverUrl: "https://picsum.photos/seed/u1cover/800/300",
    link: "https://titan.example/ava",
    privacySettings: {
      messageAudience: "everyone",
      postVisibility: "public",
      tagAudience: "everyone",
    },
  },
  {
    id: "u-2",
    handle: "liam",
    displayName: "Liam Carter",
    avatarUrl: null,
    bio: null,
    coverUrl: null,
    link: null,
    privacySettings: {
      messageAudience: "everyone",
      postVisibility: "public",
      tagAudience: "everyone",
    },
  },
];

/** Mirrors the post fixtures (kept in sync by hand; boundary forbids importing). */
const mockPosts = [
  {
    id: "p-1",
    authorId: "u-1",
    body: "Good morning ☀️",
    media: [{ kind: "image", url: "https://picsum.photos/seed/p1/800/600" }],
    likeCount: 38,
    likedByMe: false,
    createdAt: "2026-09-09T10:00:00.000Z",
  },
  {
    id: "p-2",
    authorId: "u-2",
    body: "Pre-liked post for unlike-state tests.",
    media: [],
    likeCount: 1400,
    likedByMe: true,
    createdAt: "2026-09-08T08:30:00.000Z",
  },
  {
    id: "post-fail",
    authorId: "u-1",
    body: "Mock API always fails for this post to verify rollback.",
    media: [],
    likeCount: 5,
    likedByMe: false,
    createdAt: "2026-09-07T12:00:00.000Z",
  },
];

/** Id forced to 500 on the like endpoint (rollback tests). */
const FAIL_LIKE_POST_ID = "post-fail";

/**
 * Deleted posts (G1.3): ids stay in the fixture arrays, every reader filters
 * them out and single-item endpoints 404. New ids from `POST /posts` are
 * client-cached only (existing F1 behavior).
 */
const deletedPostIds = new Set<string>();

function isPostGone(id: string): boolean {
  return deletedPostIds.has(id);
}

function mockUpdatePostResponse(id: string, bodyText: string | null): Response {
  const base =
    mockPosts.find((post) => post.id === id) ?? feedPosts.find((post) => post.id === id);
  if (!base || isPostGone(id)) return notFound("PATCH", `/posts/${id}`);
  if (base.authorId !== ME_ID) {
    return jsonResponse({ message: "[mock] Not the post owner" }, 403);
  }
  let body = "";
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object" && "body" in parsed) {
      const candidate = (parsed as { body?: unknown }).body;
      if (typeof candidate === "string") body = candidate.trim();
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  if (body.length < 1 || body.length > 280) {
    return jsonResponse({ message: "[mock] Invalid edit input" }, 400);
  }
  base.body = body;
  return jsonResponse({ ...base }, 200);
}

function mockDeletePostResponse(id: string): Response {
  const base =
    mockPosts.some((post) => post.id === id) || feedPosts.some((post) => post.id === id);
  if (!base || isPostGone(id)) return notFound("DELETE", `/posts/${id}`);
  const target =
    mockPosts.find((post) => post.id === id) ?? feedPosts.find((post) => post.id === id);
  if (target && target.authorId !== ME_ID) {
    return jsonResponse({ message: "[mock] Not the post owner" }, 403);
  }
  deletedPostIds.add(id);
  return jsonResponse({ ok: true }, 200);
}

/**
 * Edit-profile mock (G2.1): PATCH `/users/me` validates displayName/bio/
 * avatar/cover/link, persists in-memory for the session, and echoes the full
 * user. Invalid input → 400 so the entity throws with local state untouched.
 */
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "file:" ||
      url.protocol === "data:" ||
      url.protocol === "blob:"
    );
  } catch {
    return false;
  }
}

function mockUpdateProfileResponse(bodyText: string | null): Response {
  const me = mockUsers[0];
  if (!me) return notFound("PATCH", "/users/me");
  let displayName: unknown = undefined;
  let bio: unknown = undefined;
  let avatarUrl: unknown = undefined;
  let coverUrl: unknown = undefined;
  let link: unknown = undefined;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      displayName = candidate["displayName"];
      bio = candidate["bio"];
      avatarUrl = candidate["avatarUrl"];
      coverUrl = candidate["coverUrl"];
      link = candidate["link"];
    } else {
      return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  if (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.trim().length > 50) {
    return jsonResponse({ message: "[mock] Invalid displayName" }, 400);
  }
  if (bio !== null && (typeof bio !== "string" || bio.length > 160)) {
    return jsonResponse({ message: "[mock] Invalid bio" }, 400);
  }
  if (avatarUrl !== null && (typeof avatarUrl !== "string" || !isValidHttpUrl(avatarUrl))) {
    return jsonResponse({ message: "[mock] Invalid avatarUrl" }, 400);
  }
  if (coverUrl !== null && (typeof coverUrl !== "string" || !isValidHttpUrl(coverUrl))) {
    return jsonResponse({ message: "[mock] Invalid coverUrl" }, 400);
  }
  if (link !== null && (typeof link !== "string" || (link.length > 0 && !isValidHttpUrl(link)))) {
    return jsonResponse({ message: "[mock] Invalid link" }, 400);
  }
  me.displayName = displayName.trim();
  me.bio = typeof bio === "string" && bio.trim().length > 0 ? bio.trim() : null;
  me.avatarUrl = typeof avatarUrl === "string" ? avatarUrl : null;
  me.coverUrl = typeof coverUrl === "string" ? coverUrl : null;
  me.link = typeof link === "string" && link.trim().length > 0 ? link.trim() : null;
  return jsonResponse({ ...me }, 200);
}

/**
 * Saved posts mock (G1.4): per-viewer set of post ids (single mock viewer).
 * `feed-p-2` starts saved so the Saved tab is non-empty on first open.
 */
const SAVED_PAGE_SIZE = 10;

type SavedWirePost = {
  id: string;
  authorId: string;
  body: string;
  media: { kind: "image" | "video"; url: string }[];
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

function toSavedWirePost(post: {
  id: string;
  authorId: string;
  body: string;
  media: { kind: string; url: string }[];
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
}): SavedWirePost | null {
  if (!post.media.every((m) => m.kind === "image" || m.kind === "video")) return null;
  return {
    ...post,
    media: post.media.map((m) => ({ kind: m.kind as "image" | "video", url: m.url })),
  };
}

const savedPostIds = new Set<string>(["feed-p-2"]);

function savedWireItems(): { post: SavedWirePost; author: FeedMockAuthor }[] {
  const ids = [...savedPostIds].reverse();
  const items: { post: SavedWirePost; author: FeedMockAuthor }[] = [];
  for (const id of ids) {
    const post =
      mockPosts.find((candidate) => candidate.id === id) ??
      feedPosts.find((candidate) => candidate.id === id);
    if (!post || isPostGone(id)) continue;
    const wire = toSavedWirePost(post);
    if (!wire) continue;
    const author = findMockUser(post.authorId) ?? feedAuthors[0];
    items.push({ post: wire, author });
  }
  return items;
}

function savedPageResponse(cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = savedWireItems().slice(offset, offset + SAVED_PAGE_SIZE);
  const total = savedWireItems().length;
  const next = offset + SAVED_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < total ? String(next) : null },
    200,
  );
}

function mockSavePostResponse(id: string): Response {
  const known =
    mockPosts.some((post) => post.id === id) || feedPosts.some((post) => post.id === id);
  if (!known || isPostGone(id)) return notFound("POST", `/saved/${id}`);
  savedPostIds.add(id);
  return jsonResponse({ ok: true }, 200);
}

function mockUnsavePostResponse(id: string): Response {
  const known =
    mockPosts.some((post) => post.id === id) || feedPosts.some((post) => post.id === id);
  if (!known) return notFound("DELETE", `/saved/${id}`);
  savedPostIds.delete(id);
  return jsonResponse({ ok: true }, 200);
}

/**
 * Hashtag mock (G1.5): posts whose body contains `#tag` (case-insensitive,
 * tag-boundary aware). Empty result is 200 (a valid empty tag page).
 */
const HASHTAG_PAGE_SIZE = 10;

function hashtagPageResponse(tag: string, cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const normalized = tag.trim().toLowerCase().replace(/^#+/, "");
  const needle = `#${normalized}`;
  const matched = feedPosts.filter((post) => {
    if (isPostGone(post.id)) return false;
    // G2.3: hidden/gated authors vanish from tag pages too.
    if (isPostHiddenFromViewerMock(post.authorId)) return false;
    const lower = post.body.toLowerCase();
    let at = lower.indexOf(needle);
    while (at !== -1) {
      const after = lower[at + needle.length];
      if (after === undefined || !/[a-z0-9_]/.test(after)) return true;
      at = lower.indexOf(needle, at + 1);
    }
    return false;
  });
  const items = matched.slice(offset, offset + HASHTAG_PAGE_SIZE).map((post) => ({
    post,
    author: feedAuthors.find((author) => author.id === post.authorId) ?? feedAuthors[0],
  }));
  const next = offset + HASHTAG_PAGE_SIZE;
  // G2.2: header needs the total count; keep `items/nextCursor` for G1 compat.
  return jsonResponse(
    {
      items,
      nextCursor: next < matched.length ? String(next) : null,
      tag: normalized,
      postCount: matched.length,
    },
    200,
  );
}

/**
 * Trending mock (G2.2): tag hot (counted from live feed bodies, desc) +
 * user gợi ý (5 authors excluding the viewer). `GET /trending` → 200.
 */
function trendingResponse(): Response {
  const counts = new Map<string, { count: number; latest: string }>();
  for (const post of feedPosts) {
    if (isPostGone(post.id)) continue;
    if (isPostHiddenFromViewerMock(post.authorId)) continue;
    const tags = post.body.match(/#[A-Za-z0-9_]+/g) ?? [];
    for (const raw of tags) {
      const tag = raw.slice(1).toLowerCase();
      // Skip numeric-only tags from "Feed post #N" bodies.
      if (/^\d+$/.test(tag)) continue;
      const prev = counts.get(tag);
      if (!prev) {
        counts.set(tag, { count: 1, latest: post.createdAt });
      } else {
        counts.set(tag, {
          count: prev.count + 1,
          latest: post.createdAt > prev.latest ? post.createdAt : prev.latest,
        });
      }
    }
  }
  const tags = [...counts.entries()]
    .map(([tag, info]) => ({ tag, postCount: info.count, updatedAt: info.latest }))
    .sort((a, b) => b.postCount - a.postCount || a.tag.localeCompare(b.tag))
    .slice(0, 10);
  // G2.3: safety-hidden authors vanish from suggestions too.
  const users = feedAuthors
    .filter((author) => author.id !== ME_ID && !isSafetyHiddenMock(author.id))
    .slice(0, 5);
  return jsonResponse({ tags, users }, 200);
}

/**
 * Deterministic feed mock (40 posts / 8 users, page 10).
 * `post-fail` sits at index 7 for first-page rollback tests.
 */
const FEED_PAGE_SIZE = 10;

type FeedMockAuthor = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  coverUrl?: string | null;
  link?: string | null;
};

type FeedMockPost = {
  id: string;
  authorId: string;
  body: string;
  media: { kind: "image" | "video"; url: string }[];
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

const feedAuthors: FeedMockAuthor[] = [
  ...mockUsers,
  {
    id: "u-feed-3",
    handle: "mia",
    displayName: "Mia Chen",
    avatarUrl: "https://picsum.photos/seed/ufeed3/200",
    bio: null,
    coverUrl: null,
    link: null,
  },
  {
    id: "u-feed-4",
    handle: "noah",
    displayName: "Noah Kim",
    avatarUrl: "https://picsum.photos/seed/ufeed4/200",
    bio: null,
    coverUrl: null,
    link: null,
  },
  {
    id: "u-feed-5",
    handle: "ella",
    displayName: "Ella Brooks",
    avatarUrl: null,
    bio: null,
    coverUrl: null,
    link: null,
  },
  {
    id: "u-feed-6",
    handle: "lucas",
    displayName: "Lucas Gray",
    avatarUrl: "https://picsum.photos/seed/ufeed6/200",
    bio: null,
    coverUrl: null,
    link: null,
  },
  {
    id: "u-feed-7",
    handle: "sofia",
    displayName: "Sofia Reed",
    avatarUrl: "https://picsum.photos/seed/ufeed7/200",
    bio: null,
    coverUrl: null,
    link: null,
  },
  {
    id: "u-feed-8",
    handle: "ethan",
    displayName: "Ethan Cole",
    avatarUrl: "https://picsum.photos/seed/ufeed8/200",
    bio: null,
    coverUrl: null,
    link: null,
  },
];

/** Mirrors the `post-fail` entry in `mockPosts`; keep in sync by hand. */
const feedFailPost: FeedMockPost = {
  id: "post-fail",
  authorId: "u-1",
  body: "Mock API always fails for this post to verify rollback.",
  media: [],
  likeCount: 5,
  likedByMe: false,
  createdAt: "2026-09-07T12:00:00.000Z",
};

/**
 * Deterministic notifications mock (F5): 25 items cycling
 * like/follow/post/mention, first 5 unread. `cursor` is an offset.
 */
const NOTIFICATIONS_PAGE_SIZE = 10;

type NotificationMockItem = {
  id: string;
  kind: "like" | "follow" | "post" | "mention";
  actorId: string;
  postId: string | null;
  read: boolean;
  createdAt: string;
};

const NOTIFICATION_KINDS = ["like", "follow", "post", "mention"] as const;

function buildNotifications(): NotificationMockItem[] {
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  // G2.3: actors skip safety-hidden lucas so default counts stay stable
  // under actor filtering (inbox filters blocked/muted actors).
  const actorPool = feedAuthors.filter((author) => author.id !== "u-feed-6");
  const items: NotificationMockItem[] = [];
  for (let i = 1; i <= 25; i++) {
    const kind = NOTIFICATION_KINDS[(i - 1) % NOTIFICATION_KINDS.length] ?? "like";
    const author = actorPool[i % actorPool.length] ?? feedAuthors[0];
    const post = feedPosts[(i - 1) % feedPosts.length] ?? feedPosts[0];
    items.push({
      id: `n-${i}`,
      kind,
      actorId: author.id,
      postId: kind === "follow" ? null : post.id,
      read: i > 5,
      createdAt: new Date(baseTime - i * 1_800_000).toISOString(),
    });
  }
  return items;
}

/** Id forced to 500 on the mark-read endpoint (rollback tests). */
const FAIL_READ_NOTIFICATION_ID = "n-fail";

const FAIL_READ_NOTIFICATION_FIXTURE: NotificationMockItem = {
  id: FAIL_READ_NOTIFICATION_ID,
  kind: "like",
  actorId: "u-1",
  postId: "feed-p-1",
  read: false,
  createdAt: new Date(Date.parse("2026-09-09T10:00:00.000Z") - 26 * 1_800_000).toISOString(),
};

function notificationsPageResponse(cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  // G2.3: muted kinds vanish but other kinds stay (like off → follow stays);
  // safety-hidden actors vanish too. Filter before paginating.
  const visible = notificationsFixtures.filter((item) => {
    if (notifPrefsMock[prefKeyForNotifKind(item.kind)] === false) return false;
    if (isSafetyHiddenMock(item.actorId)) return false;
    return true;
  });
  const items = visible.slice(offset, offset + NOTIFICATIONS_PAGE_SIZE);
  const next = offset + NOTIFICATIONS_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < visible.length ? String(next) : null },
    200,
  );
}

/**
 * Chat mock (F4): 12 conversations cycling feed authors, 30 messages
 * in `c-1` for pagination. `cursor` is an offset. `c-fail` forces 500
 * on send so optimistic rollback is testable.
 */
const CONVERSATIONS_PAGE_SIZE = 10;
const MESSAGES_PAGE_SIZE = 15;

type ConversationMockItem = {
  id: string;
  title: string;
  participantIds: string[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

type ChatMessageMockItem = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  // G3.3: `queued` is local-only (outbox); the mock server only emits sent/seen.
  status: "sent" | "seen" | "queued";
  createdAt: string;
};

const FAIL_SEND_CONVERSATION_ID = "c-fail";

function buildConversations(): ConversationMockItem[] {
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  const items: ConversationMockItem[] = [];
  for (let i = 1; i <= 12; i++) {
    const author = feedAuthors[i % feedAuthors.length] ?? feedAuthors[0];
    items.push({
      id: `c-${i}`,
      title: author.displayName,
      participantIds: [author.id],
      lastMessagePreview: `Last message preview ${i}`,
      lastMessageAt: new Date(baseTime - i * 3_600_000).toISOString(),
      unreadCount: i <= 3 ? i : 0,
    });
  }
  items.push({
    id: FAIL_SEND_CONVERSATION_ID,
    title: "Fail Chat",
    participantIds: ["u-1"],
    lastMessagePreview: "send always fails here",
    lastMessageAt: new Date(baseTime - 13 * 3_600_000).toISOString(),
    unreadCount: 0,
  });
  return items;
}

const conversationFixtures: ConversationMockItem[] = buildConversations();

function buildChatMessages(): ChatMessageMockItem[] {
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  const items: ChatMessageMockItem[] = [];
  for (let i = 1; i <= 30; i++) {
    const withImage = i === 7;
    items.push({
      id: `m-${i}`,
      conversationId: "c-1",
      senderId: i % 2 === 0 ? "me" : "u-1",
      body: withImage ? "" : `Chat message #${i} in c-1`,
      imageUrl: withImage ? "https://picsum.photos/seed/chat-m-7/800/600" : null,
      status: i <= 28 ? "seen" : "sent",
      createdAt: new Date(baseTime - (30 - i) * 120_000).toISOString(),
    });
  }
  return items;
}

const chatMessageFixtures: ChatMessageMockItem[] = buildChatMessages();

/**
 * Presence mock (G3.2): `{ userId, online, lastSeenAt, typingInConvId }`.
 * Deterministic per user id so list/detail show stable online dots;
 * typing is always idle over HTTP (live typing rides the socket stub).
 */
type PresenceMockItem = {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
  typingInConversationId: string | null;
  typingExpiresAt: string | null;
};

function mockPresenceResponse(userId: string): Response {
  if (!knownUserId(userId) && userId !== "me") {
    return notFound("GET", `/users/${userId}/presence`);
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  const online = hash % 2 === 0;
  const item: PresenceMockItem = {
    userId,
    online,
    lastSeenAt: online ? null : new Date(Date.parse("2026-09-09T10:00:00.000Z") - (hash % 20 + 1) * 3_600_000).toISOString(),
    typingInConversationId: null,
    typingExpiresAt: null,
  };
  return jsonResponse(item, 200);
}

function mockConversationReadResponse(conversationId: string): Response {
  const known =
    conversationFixtures.some((c) => c.id === conversationId) || conversationId === "c-1";
  if (!known) return notFound("POST", `/conversations/${conversationId}/read`);
  return jsonResponse({ ok: true }, 200);
}

function conversationsPageResponse(cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = conversationFixtures.slice(offset, offset + CONVERSATIONS_PAGE_SIZE);
  const next = offset + CONVERSATIONS_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < conversationFixtures.length ? String(next) : null },
    200,
  );
}

function chatMessagesPageResponse(conversationId: string, cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const mine = chatMessageFixtures.filter((m) => m.conversationId === conversationId);
  // Empty thread is valid (new conversation) — 200 with no items.
  const items = mine.slice(offset, offset + MESSAGES_PAGE_SIZE);
  const next = offset + MESSAGES_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < mine.length ? String(next) : null },
    200,
  );
}

function mockSendMessageResponse(conversationId: string, bodyText: string | null): Response {
  if (conversationId === FAIL_SEND_CONVERSATION_ID) {
    return jsonResponse({ message: "[mock] forced send failure" }, 500);
  }
  const known =
    conversationFixtures.some((c) => c.id === conversationId) || conversationId === "c-1";
  if (!known) return notFound("POST", `/conversations/${conversationId}/messages`);
  let body = "";
  let imageUrl: string | null = null;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as { body?: unknown; imageUrl?: unknown };
      if (typeof candidate.body === "string") body = candidate.body.trim();
      if (typeof candidate.imageUrl === "string" && candidate.imageUrl.length > 0) {
        imageUrl = candidate.imageUrl;
      }
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  // G3.1: text-only, image-only, or both — at least one is required.
  if ((body.length < 1 && !imageUrl) || body.length > 2000) {
    return jsonResponse({ message: "[mock] Invalid message input" }, 400);
  }
  return jsonResponse(
    {
      id: `m-new-${Date.now().toString(36)}`,
      conversationId,
      senderId: "me",
      body,
      imageUrl,
      status: "sent",
      createdAt: new Date().toISOString(),
    },
    201,
  );
}

function mockMarkReadResponse(id: string): Response {
  const item = notificationsFixtures.find((candidate) => candidate.id === id);
  if (!item) return notFound("POST", `/notifications/${id}/read`);
  if (id === FAIL_READ_NOTIFICATION_ID) {
    return jsonResponse({ message: "[mock] forced mark-read failure" }, 500);
  }
  // Stateless echo with read:true (no persist — documented in the F5 plan).
  return jsonResponse({ ...item, read: true }, 200);
}

/**
 * Moderation mock (F6): in-memory relationships + report validation.
 * Unknown user ids 404 so safety-action rollback is testable.
 */
const REPORT_REASONS = [
  "spam",
  "harassment",
  "nudity",
  "violence",
  "misinformation",
  "other",
] as const;

const relationshipOverrides = new Map<string, { blockedByMe: boolean; mutedByMe: boolean }>();

function knownUserId(id: string): boolean {
  return [...mockUsers, ...feedAuthors].some((candidate) => candidate.id === id);
}

function allMockUsers(): FeedMockAuthor[] {
  const byId = new Map<string, FeedMockAuthor>();
  for (const user of [...mockUsers, ...feedAuthors]) byId.set(user.id, user);
  return [...byId.values()];
}

function findMockUser(id: string): FeedMockAuthor | undefined {
  return allMockUsers().find((candidate) => candidate.id === id);
}

/**
 * Follow mock (G1.1): pair-aware relationships for the single mock viewer
 * (`u-1`, same identity as `GET /users/me`). `followPairs` holds
 * `"follower>target"` → status. Seeds:
 * - `u-2` is followed by Mia/Noah (device shows a non-empty followers list);
 * - `u-2` follows the viewer (viewer has one follower);
 * - Mia requested the viewer (approve/reject demo on the requests screen);
 * - Ella (`u-feed-5`) is private → follow returns `requested`, posts gated;
 * - Lucas (`u-feed-6`) blocked the viewer → reverse-block gating fixture.
 */
const ME_ID = "u-1";

type FollowPairState = "following" | "requested";

const followPairs = new Map<string, FollowPairState>([
  ["u-feed-3>u-2", "following"],
  ["u-feed-4>u-2", "following"],
  ["u-2>u-1", "following"],
  ["u-feed-3>u-1", "requested"],
]);

const blockPairs = new Set<string>(["u-feed-6>u-1"]);

const privateIds = new Set<string>(["u-feed-5"]);

const followersBaseCount: Record<string, number> = { "u-1": 12, "u-2": 30 };
const followingBaseCount: Record<string, number> = { "u-1": 9, "u-2": 14 };
const DEFAULT_BASE_FOLLOWERS = 6;
const DEFAULT_BASE_FOLLOWING = 5;

function pairStatesTo(targetId: string, state: FollowPairState): string[] {
  const ids: string[] = [];
  followPairs.forEach((value, key) => {
    const separator = key.indexOf(">");
    const follower = key.slice(0, separator);
    const target = key.slice(separator + 1);
    if (target === targetId && value === state) ids.push(follower);
  });
  return ids.sort();
}

function followersOf(targetId: string): string[] {
  return pairStatesTo(targetId, "following");
}

function followingOf(userId: string): string[] {
  const ids: string[] = [];
  followPairs.forEach((value, key) => {
    const separator = key.indexOf(">");
    const follower = key.slice(0, separator);
    const target = key.slice(separator + 1);
    if (follower === userId && value === "following") ids.push(target);
  });
  return ids.sort();
}

function followersCountOf(userId: string): number {
  return (followersBaseCount[userId] ?? DEFAULT_BASE_FOLLOWERS) + followersOf(userId).length;
}

function followingCountOf(userId: string): number {
  return (followingBaseCount[userId] ?? DEFAULT_BASE_FOLLOWING) + followingOf(userId).length;
}

function followStatusOf(targetId: string): FollowPairState | "none" {
  return followPairs.get(`${ME_ID}>${targetId}`) ?? "none";
}

/**
 * Privacy mock (G2.3): per-user settings for the single mock viewer flow.
 * `privacyOverrides` holds PATCHed values; seeds mirror the entity defaults
 * (`everyone/public/everyone`). `privateIds` (G1.1 Ella fixture) stays as an
 * additional followers-only source so G1 tests keep passing.
 */
type PrivacyMock = {
  messageAudience: "everyone" | "following" | "none";
  postVisibility: "public" | "followers";
  tagAudience: "everyone" | "following" | "none";
};

const DEFAULT_PRIVACY_MOCK: PrivacyMock = {
  messageAudience: "everyone",
  postVisibility: "public",
  tagAudience: "everyone",
};

const privacyOverrides = new Map<string, PrivacyMock>();

function privacyOf(userId: string): PrivacyMock {
  const stored = privacyOverrides.get(userId);
  if (stored) return stored;
  const user = mockUsers.find((candidate) => candidate.id === userId);
  const raw = (user as { privacySettings?: unknown } | undefined)?.privacySettings;
  if (raw !== null && typeof raw === "object") {
    const candidate = raw as Record<string, unknown>;
    const messageAudience =
      candidate["messageAudience"] === "following" || candidate["messageAudience"] === "none"
        ? candidate["messageAudience"]
        : "everyone";
    const postVisibility =
      candidate["postVisibility"] === "followers" ? "followers" : "public";
    const tagAudience =
      candidate["tagAudience"] === "following" || candidate["tagAudience"] === "none"
        ? candidate["tagAudience"]
        : "everyone";
    return { messageAudience, postVisibility, tagAudience } as PrivacyMock;
  }
  return { ...DEFAULT_PRIVACY_MOCK };
}

function isFollowersOnlyMock(userId: string): boolean {
  return privateIds.has(userId) || privacyOf(userId).postVisibility === "followers";
}

/** G2.3: safety hides in either direction (block/mute/reverse-block). */
function isSafetyHiddenMock(authorId: string): boolean {
  if (authorId === ME_ID) return false;
  const override = relationshipOverrides.get(authorId);
  if (override?.blockedByMe || override?.mutedByMe) return true;
  if (blockPairs.has(`${ME_ID}>${authorId}`)) return true;
  if (blockPairs.has(`${authorId}>${ME_ID}`)) return true;
  return false;
}

/**
 * G2.3: followers-only hides from non-followers (self always sees self).
 * Mirrors the client's `canViewPosts` gating so refetched lists agree with
 * the profile/post-detail gates.
 */
function isFollowersOnlyHiddenMock(authorId: string): boolean {
  if (authorId === ME_ID) return false;
  if (!isFollowersOnlyMock(authorId)) return false;
  return followPairs.get(`${ME_ID}>${authorId}`) !== "following";
}

/** G2.3: posts by hidden or gated authors vanish from every list. */
function isPostHiddenFromViewerMock(authorId: string): boolean {
  return isSafetyHiddenMock(authorId) || isFollowersOnlyHiddenMock(authorId);
}

/**
 * Notif prefs mock (G2.3): single-viewer toggles, all on by default.
 * `like` off hides `like` notices but `follow` notices stay (acceptance).
 */
const notifPrefsMock: Record<string, boolean> = {
  like: true,
  follow: true,
  comment: true,
  mention: true,
  message: true,
};

function prefKeyForNotifKind(kind: string): string {
  // `post` (someone shared) follows the `follow` toggle — those notices only
  // exist for followed authors. Mirrors the entity's `prefKeyForKind`.
  if (kind === "post") return "follow";
  return kind;
}

function mockNotifPrefsResponse(bodyText: string | null): Response {
  let patch: Record<string, unknown>;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
    }
    patch = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  const keys = ["like", "follow", "comment", "mention", "message"];
  const next = { ...notifPrefsMock };
  let touched = false;
  for (const key of keys) {
    if (!(key in patch)) continue;
    if (typeof patch[key] !== "boolean") {
      return jsonResponse({ message: `[mock] Invalid notif pref ${key}` }, 400);
    }
    next[key] = patch[key] as boolean;
    touched = true;
  }
  if (!touched) return jsonResponse({ message: "[mock] Empty prefs patch" }, 400);
  Object.assign(notifPrefsMock, next);
  return jsonResponse({ ...notifPrefsMock }, 200);
}

function mockUpdatePrivacyResponse(bodyText: string | null): Response {
  const me = mockUsers[0];
  if (!me) return notFound("PATCH", "/users/me/privacy");
  let patch: Record<string, unknown>;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
    }
    patch = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  const allowedAudiences = ["everyone", "following", "none"];
  const next = { ...privacyOf(ME_ID) };
  let touched = false;
  if ("messageAudience" in patch) {
    if (!allowedAudiences.includes(patch["messageAudience"] as string)) {
      return jsonResponse({ message: "[mock] Invalid messageAudience" }, 400);
    }
    next.messageAudience = patch["messageAudience"] as PrivacyMock["messageAudience"];
    touched = true;
  }
  if ("postVisibility" in patch) {
    if (patch["postVisibility"] !== "public" && patch["postVisibility"] !== "followers") {
      return jsonResponse({ message: "[mock] Invalid postVisibility" }, 400);
    }
    next.postVisibility = patch["postVisibility"];
    touched = true;
  }
  if ("tagAudience" in patch) {
    if (!allowedAudiences.includes(patch["tagAudience"] as string)) {
      return jsonResponse({ message: "[mock] Invalid tagAudience" }, 400);
    }
    next.tagAudience = patch["tagAudience"] as PrivacyMock["tagAudience"];
    touched = true;
  }
  if (!touched) return jsonResponse({ message: "[mock] Empty privacy patch" }, 400);
  privacyOverrides.set(ME_ID, next);
  (me as { privacySettings: PrivacyMock }).privacySettings = { ...next };
  return jsonResponse({ ...me }, 200);
}

/**
 * Account mock (G2.4): sessions list, password change, deactivate/delete,
 * data export. Module-level session store so revokes persist for the
 * session (same discipline as the comments store).
 */
type SessionMockItem = {
  id: string;
  deviceName: string;
  ipAddress: string;
  current: boolean;
  lastActiveAt: string;
};

const CURRENT_SESSION_ID = "sess-current";

function buildSessions(): SessionMockItem[] {
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  const at = (hoursAgo: number): string =>
    new Date(baseTime - hoursAgo * 3_600_000).toISOString();
  return [
    {
      id: CURRENT_SESSION_ID,
      deviceName: "This device",
      ipAddress: "192.168.1.10",
      current: true,
      lastActiveAt: new Date(baseTime).toISOString(),
    },
    {
      id: "sess-web",
      deviceName: "Chrome on Windows",
      ipAddress: "203.0.113.42",
      current: false,
      lastActiveAt: at(5),
    },
    {
      id: "sess-android",
      deviceName: "Pixel 8",
      ipAddress: "198.51.100.23",
      current: false,
      lastActiveAt: at(26),
    },
  ];
}

const sessionStore: SessionMockItem[] = buildSessions();

function mockChangePasswordResponse(bodyText: string | null): Response {
  let currentPassword: unknown = null;
  let newPassword: unknown = null;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      currentPassword = candidate["currentPassword"];
      newPassword = candidate["newPassword"];
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  if (typeof currentPassword !== "string" || currentPassword.length < 1) {
    return jsonResponse({ message: "[mock] Current password required" }, 400);
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return jsonResponse({ message: "[mock] New password too short" }, 400);
  }
  if (newPassword === currentPassword) {
    return jsonResponse({ message: "[mock] New password must differ" }, 400);
  }
  return jsonResponse({ ok: true }, 200);
}

function mockRevokeSessionResponse(id: string): Response {
  const index = sessionStore.findIndex((item) => item.id === id);
  if (index === -1) return notFound("DELETE", `/sessions/${id}`);
  const [removed] = sessionStore.splice(index, 1);
  return jsonResponse({ ok: true, revokedCurrent: removed?.current === true }, 200);
}

function mockExportResponse(): Response {
  const me = mockUsers[0];
  if (!me) return notFound("GET", "/users/me/export");
  const mine = [...mockPosts, ...feedPosts]
    .filter((post) => post.authorId === ME_ID && !isPostGone(post.id))
    .map((post) => ({
      id: post.id,
      body: post.body,
      likeCount: post.likeCount,
      createdAt: post.createdAt,
    }));
  return jsonResponse(
    {
      profile: {
        id: me.id,
        handle: me.handle,
        displayName: me.displayName,
        bio: me.bio,
        avatarUrl: me.avatarUrl,
        coverUrl: me.coverUrl,
        link: me.link,
      },
      posts: mine,
      exportedAt: new Date().toISOString(),
    },
    200,
  );
}

function relationshipFor(userId: string): Response {
  if (!knownUserId(userId)) return notFound("GET", `/users/${userId}/relationship`);
  const override = relationshipOverrides.get(userId) ?? {
    blockedByMe: false,
    mutedByMe: false,
  };
  return jsonResponse(
    {
      userId,
      blockedByMe: override.blockedByMe || blockPairs.has(`${ME_ID}>${userId}`),
      mutedByMe: override.mutedByMe,
      followStatus: followStatusOf(userId),
      followersCount: followersCountOf(userId),
      followingCount: followingCountOf(userId),
      isPrivate: isFollowersOnlyMock(userId),
      blockedByTarget: blockPairs.has(`${userId}>${ME_ID}`),
      updatedAt: new Date().toISOString(),
    },
    200,
  );
}

function mockSafetyResponse(
  userId: string,
  patch: { blockedByMe?: boolean; mutedByMe?: boolean },
): Response {
  if (!knownUserId(userId)) return notFound("POST", `/users/${userId}`);
  const prev = relationshipOverrides.get(userId) ?? {
    blockedByMe: false,
    mutedByMe: false,
  };
  const next = { ...prev, ...patch };
  relationshipOverrides.set(userId, next);
  if (patch.blockedByMe === true) blockPairs.add(`${ME_ID}>${userId}`);
  if (patch.blockedByMe === false) blockPairs.delete(`${ME_ID}>${userId}`);
  // Full relationship shape (follow fields included) so entity parse keeps passing.
  return relationshipFor(userId);
}

function mockReportResponse(bodyText: string | null): Response {
  let targetType: unknown = null;
  let targetId: unknown = null;
  let reason: unknown = null;
  let details: unknown = undefined;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      targetType = candidate["targetType"];
      targetId = candidate["targetId"];
      reason = candidate["reason"];
      details = candidate["details"];
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  const validTarget = targetType === "post" || targetType === "user";
  const validId = typeof targetId === "string" && targetId.trim().length > 0;
  const validReason =
    typeof reason === "string" && (REPORT_REASONS as readonly string[]).includes(reason);
  const validDetails =
    details === undefined ||
    (typeof details === "string" && details.length <= 500);
  if (!validTarget || !validId || !validReason || !validDetails) {
    return jsonResponse({ message: "[mock] Invalid report input" }, 400);
  }
  return jsonResponse({ ok: true, reportId: `r-${Date.now().toString(36)}` }, 201);
}

function mockFollowResponse(userId: string): Response {
  if (!knownUserId(userId)) return notFound("POST", `/users/${userId}/follow`);
  followPairs.set(`${ME_ID}>${userId}`, isFollowersOnlyMock(userId) ? "requested" : "following");
  return relationshipFor(userId);
}

function mockUnfollowResponse(userId: string): Response {
  if (!knownUserId(userId)) return notFound("POST", `/users/${userId}/unfollow`);
  followPairs.delete(`${ME_ID}>${userId}`);
  return relationshipFor(userId);
}

const FOLLOW_LIST_PAGE_SIZE = 10;

function followListResponse(ids: string[], cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = ids
    .slice(offset, offset + FOLLOW_LIST_PAGE_SIZE)
    .map((id) => findMockUser(id))
    .filter((user) => user !== undefined);
  const next = offset + FOLLOW_LIST_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < ids.length ? String(next) : null },
    200,
  );
}

function mockApproveResponse(followerId: string): Response {
  if (!knownUserId(followerId)) return notFound("POST", `/follow-requests/${followerId}/approve`);
  followPairs.set(`${followerId}>${ME_ID}`, "following");
  return jsonResponse({ ok: true }, 200);
}

function mockRejectResponse(followerId: string): Response {
  if (!knownUserId(followerId)) return notFound("POST", `/follow-requests/${followerId}/reject`);
  followPairs.delete(`${followerId}>${ME_ID}`);
  return jsonResponse({ ok: true }, 200);
}

/**
 * Comments mock (G1.2): module-level store so created comments persist for
 * the session (kill-app is a JS reload — documented as session persist).
 * Seeds: `feed-p-1` has 12 top-level + 4 replies (2 pages of 10 tops),
 * `c-fail` forces 500 on like (rollback tests), `p-1` has 2 top-level.
 */
const COMMENTS_PAGE_SIZE = 10;
const COMMENT_MAX_BODY = 500;

type CommentMockItem = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

const FAIL_LIKE_COMMENT_ID = "c-fail";

function buildComments(): CommentMockItem[] {
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  const at = (minutesAgo: number): string => new Date(baseTime - minutesAgo * 60_000).toISOString();
  // Newest-first top-level ids for feed-p-1 (c-fail sits on page 1).
  const topIds = [
    "c-p1-01",
    "c-p1-02",
    FAIL_LIKE_COMMENT_ID,
    "c-p1-04",
    "c-p1-05",
    "c-p1-06",
    "c-p1-07",
    "c-p1-08",
    "c-p1-09",
    "c-p1-10",
    "c-p1-11",
    "c-p1-12",
  ];
  // G2.3: comment authors skip safety-hidden lucas so default counts stay
  // stable under safety filtering (comment lists filter blocked/muted only).
  const commentAuthorPool = feedAuthors.filter((author) => author.id !== "u-feed-6");
  const items: CommentMockItem[] = topIds.map((id, index) => {
    const author = commentAuthorPool[(index + 1) % commentAuthorPool.length] ?? feedAuthors[0];
    return {
      id,
      postId: "feed-p-1",
      authorId: author.id,
      body: id === FAIL_LIKE_COMMENT_ID ? "Like always fails here." : `Top-level comment ${index + 1} on feed-p-1.`,
      parentId: null,
      likeCount: (index * 13) % 40,
      likedByMe: index % 4 === 1,
      createdAt: at(10 + index * 7),
    };
  });
  const replies: [string, string, string, number][] = [
    // [id, parentId, body, minutesAgo]
    ["c-p1-r1", "c-p1-01", "First reply to c-p1-01.", 55],
    ["c-p1-r2", "c-p1-01", "Second reply to c-p1-01.", 48],
    ["c-p1-r3", "c-p1-01", "Third reply to c-p1-01.", 41],
    ["c-p1-r4", "c-p1-02", "Only reply to c-p1-02.", 52],
  ];
  replies.forEach(([id, parentId, body, minutesAgo], index) => {
    const author = commentAuthorPool[(index + 3) % commentAuthorPool.length] ?? feedAuthors[0];
    items.push({
      id,
      postId: "feed-p-1",
      authorId: author.id,
      body,
      parentId,
      likeCount: index + 1,
      likedByMe: false,
      createdAt: at(minutesAgo),
    });
  });
  ["First comment on p-1.", "Second comment on p-1."].forEach((body, index) => {
    const author = commentAuthorPool[index % commentAuthorPool.length] ?? feedAuthors[0];
    items.push({
      id: `c-p1x-0${index + 1}`,
      postId: "p-1",
      authorId: author.id,
      body,
      parentId: null,
      likeCount: index,
      likedByMe: false,
      createdAt: at(120 + index * 11),
    });
  });
  return items;
}

const commentStore: CommentMockItem[] = buildComments();

function knownPostId(id: string): boolean {
  return (
    !isPostGone(id) &&
    (mockPosts.some((post) => post.id === id) || feedPosts.some((post) => post.id === id))
  );
}

function postCommentsPageResponse(postId: string, cursor: string | null): Response {
  if (!knownPostId(postId)) return notFound("GET", `/posts/${postId}/comments`);
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const tops = commentStore
    .filter(
      (item) =>
        item.postId === postId &&
        item.parentId === null &&
        !isSafetyHiddenMock(item.authorId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = tops.slice(offset, offset + COMMENTS_PAGE_SIZE);
  const items: { comment: CommentMockItem; author: FeedMockAuthor }[] = [];
  for (const top of page) {
    const author = findMockUser(top.authorId) ?? feedAuthors[0];
    items.push({ comment: top, author });
    const replies = commentStore
      .filter(
        (item) =>
          item.postId === postId &&
          item.parentId === top.id &&
          !isSafetyHiddenMock(item.authorId),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const reply of replies) {
      const replyAuthor = findMockUser(reply.authorId) ?? feedAuthors[0];
      items.push({ comment: reply, author: replyAuthor });
    }
  }
  const next = offset + COMMENTS_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < tops.length ? String(next) : null },
    200,
  );
}

function mockCreateCommentResponse(postId: string, bodyText: string | null): Response {
  if (!knownPostId(postId)) return notFound("POST", `/posts/${postId}/comments`);
  let body = "";
  let parentId: unknown = null;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as { body?: unknown; parentId?: unknown };
      if (typeof candidate.body === "string") body = candidate.body.trim();
      parentId = candidate.parentId ?? null;
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  if (body.length < 1 || body.length > COMMENT_MAX_BODY) {
    return jsonResponse({ message: "[mock] Invalid comment input" }, 400);
  }
  if (parentId !== null) {
    const parent =
      typeof parentId === "string"
        ? commentStore.find((item) => item.id === parentId && item.postId === postId)
        : undefined;
    if (!parent) return jsonResponse({ message: "[mock] Unknown parent comment" }, 400);
  }
  const created: CommentMockItem = {
    id: `c-new-${Date.now().toString(36)}`,
    postId,
    authorId: ME_ID,
    body,
    parentId: typeof parentId === "string" ? parentId : null,
    likeCount: 0,
    likedByMe: false,
    createdAt: new Date().toISOString(),
  };
  commentStore.push(created);
  return jsonResponse(created, 201);
}

function mockCommentLikeResponse(id: string, bodyText: string | null): Response {
  const base = commentStore.find((item) => item.id === id);
  if (!base) return notFound("POST", `/comments/${id}/like`);
  if (id === FAIL_LIKE_COMMENT_ID) {
    return jsonResponse({ message: "[mock] forced comment-like failure" }, 500);
  }
  let liked = !base.likedByMe;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "liked" in parsed &&
      typeof (parsed as { liked: unknown }).liked === "boolean"
    ) {
      liked = (parsed as { liked: boolean }).liked;
    }
  } catch {
    // Unknown body — keep the default toggle.
  }
  const likeCount = Math.max(0, base.likeCount + (liked === base.likedByMe ? 0 : liked ? 1 : -1));
  const next = { ...base, likedByMe: liked, likeCount };
  const index = commentStore.indexOf(base);
  commentStore[index] = next;
  return jsonResponse(next, 200);
}

function buildFeedPosts(): FeedMockPost[] {
  const posts: FeedMockPost[] = [];
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  for (let i = 1; i <= 39; i++) {
    const author = feedAuthors[i % feedAuthors.length] ?? feedAuthors[0];
    const hasMedia = i % 3 !== 0;
    // F7a demo: 3 public mp4 spread across pages so only one is visible at a time.
    const videoUrlByIndex: Record<number, string> = {
      5: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      14: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      27: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    };
    const videoUrl = videoUrlByIndex[i];
    // G1.5 seeds: one hashtag post, one mention post, one link post
    // (deterministic ids for deep taps + e2e).
    // G2.2: extra hashtag seeds so trending has deterministic counts
    // (tech 4 > travel 3 > food 2 > photo 1).
    // G2.3: seeds avoid safety-hidden (lucas, i%8==5) and followers-only
    // (ella, i%8==4) authors so default counts stay stable under filtering.
    const richSuffixByIndex: Record<number, string> = {
      3: " Loving #travel lately!",
      5: " Thanks @ava for the tips!",
      6: " Homemade #food diary!",
      7: " Details: https://titan.example/p/feed-p-1.",
      9: " Shipping #tech updates!",
      10: " Golden hour #photo walk!",
      11: " #travel diaries, part 2!",
      16: " Weekend #food market run!",
      19: " #tech deep dive thread!",
      22: " #travel throwback!",
      30: " #tech side project!",
      33: " Late-night #tech notes!",
    };
    const richSuffix = richSuffixByIndex[i] ?? "";
    posts.push({
      id: `feed-p-${i}`,
      authorId: author.id,
      body: `Feed post #${i} — pagination and cross-cache like tests.${richSuffix}`,
      media: !hasMedia
        ? []
        : videoUrl
          ? [{ kind: "video", url: videoUrl }]
          : [{ kind: "image", url: `https://picsum.photos/seed/feed-p-${i}/800/600` }],
      likeCount: (i * 37) % 500,
      likedByMe: i % 5 === 0,
      createdAt: new Date(baseTime - i * 3_600_000).toISOString(),
    });
  }
  posts.splice(7, 0, feedFailPost);
  return posts;
}

/** 40 posts; `cursor` is an offset (`"0"`, `"10"`, ...). */
const feedPosts: FeedMockPost[] = buildFeedPosts();

/** 25 notifications + 1 forced-failure item; built after feed fixtures. */
const notificationsFixtures: NotificationMockItem[] = [
  ...buildNotifications(),
  FAIL_READ_NOTIFICATION_FIXTURE,
];

function feedPageResponse(cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  // G2.3: safety-hidden + followers-only authors vanish from the feed.
  const live = feedPosts.filter(
    (post) => !isPostGone(post.id) && !isPostHiddenFromViewerMock(post.authorId),
  );
  const items = live.slice(offset, offset + FEED_PAGE_SIZE).map((post) => ({
    post,
    author: feedAuthors.find((author) => author.id === post.authorId) ?? feedAuthors[0],
  }));
  const next = offset + FEED_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < live.length ? String(next) : null },
    200,
  );
}

function userPostsPageResponse(userId: string, cursor: string | null): Response {
  // G2.3: a safety-hidden or gated author reads as empty (profile gates too).
  if (userId !== ME_ID && isPostHiddenFromViewerMock(userId)) {
    return jsonResponse({ items: [], nextCursor: null }, 200);
  }
  const mine = feedPosts.filter((post) => post.authorId === userId && !isPostGone(post.id));
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = mine.slice(offset, offset + FEED_PAGE_SIZE).map((post) => ({
    post,
    author: feedAuthors.find((author) => author.id === post.authorId) ?? feedAuthors[0],
  }));
  const next = offset + FEED_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < mine.length ? String(next) : null },
    200,
  );
}

/**
 * Search mock (F3): filters the deterministic feed fixtures in memory.
 * - `q` matches post body OR author handle/displayName (case-insensitive).
 * - `users` are the top 5 matching authors (not paginated).
 * - `items` are matching `{ post, author }` wire items, paginated by offset cursor.
 * - Empty/short `q` returns an empty 200 (client gates `enabled` on `q.length >= 2`).
 */
function searchResponse(rawQuery: string, cursor: string | null): Response {
  const q = rawQuery.trim().toLowerCase();
  if (q.length === 0) {
    return jsonResponse({ users: [], items: [], nextCursor: null }, 200);
  }
  // G2.3: safety-hidden authors vanish from people + posts (gated posts too).
  const matchedAuthors = feedAuthors.filter(
    (author) =>
      !isSafetyHiddenMock(author.id) &&
      (author.handle.toLowerCase().includes(q) ||
        author.displayName.toLowerCase().includes(q)),
  );
  const authorById = new Map(feedAuthors.map((author) => [author.id, author]));
  const matchedPosts = feedPosts.filter((post) => {
    if (isPostGone(post.id)) return false;
    if (isPostHiddenFromViewerMock(post.authorId)) return false;
    if (post.body.toLowerCase().includes(q)) return true;
    const author = authorById.get(post.authorId) ?? feedAuthors[0];
    return (
      author.handle.toLowerCase().includes(q) || author.displayName.toLowerCase().includes(q)
    );
  });
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = matchedPosts.slice(offset, offset + FEED_PAGE_SIZE).map((post) => ({
    post,
    author: authorById.get(post.authorId) ?? feedAuthors[0],
  }));
  const next = offset + FEED_PAGE_SIZE;
  return jsonResponse(
    {
      users: matchedAuthors.slice(0, 5),
      items,
      nextCursor: next < matchedPosts.length ? String(next) : null,
    },
    200,
  );
}

const defaultRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/health",
    handler: () => ({ status: "ok", variant: env.appVariant }),
  },
];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function notFound(method: HttpMethod, path: string): Response {
  return jsonResponse({ message: `[mock] No route: ${method} ${path}` }, 404);
}

function requestPath(input: string | URL | Request): string {
  const rawUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
  try {
    return new URL(rawUrl).pathname;
  } catch {
    return rawUrl;
  }
}

function requestQuery(input: string | URL | Request): Record<string, string> {
  const rawUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
  try {
    const params = new URL(rawUrl).searchParams;
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  } catch {
    return {};
  }
}

function requestBodyText(init: RequestInit | undefined): string | null {
  const body = init?.body;
  return typeof body === "string" ? body : null;
}

/** Splits `/users/:id` into base + id; anything else keeps the full path. */
function splitIdPath(path: string): { base: string; id: string | null } {
  const segments = path.split("/").filter((part) => part.length > 0);
  if (segments.length === 2) {
    return { base: `/${segments[0]}`, id: decodeURIComponent(segments[1] ?? "") };
  }
  return { base: path, id: null };
}

const MOCK_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

let mockUploadSeq = 0;
const mockUploads = new Map<string, { kind: "image" | "video"; url: string }>();

function mockUploadResponse(kind: "image" | "video"): Response {
  // Sequence keeps ids unique when two uploads land in the same millisecond.
  const stamp = `${Date.now().toString(36)}-${mockUploadSeq++}`;
  const mediaId = `m-new-${stamp}`;
  const url =
    kind === "video"
      ? MOCK_VIDEO_URL
      : `https://picsum.photos/seed/upload-${stamp}/800/600`;
  mockUploads.set(mediaId, { kind, url });
  return jsonResponse({ mediaId, url, kind }, 200);
}

function mockCreatePostResponse(bodyText: string | null): Response {
  let body = "";
  let mediaIds: unknown = [];
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (parsed !== null && typeof parsed === "object") {
      const candidate = parsed as { body?: unknown; mediaIds?: unknown };
      if (typeof candidate.body === "string") body = candidate.body.trim();
      mediaIds = candidate.mediaIds;
    }
  } catch {
    return jsonResponse({ message: "[mock] Invalid JSON" }, 400);
  }
  if (
    body.length > 280 ||
    !Array.isArray(mediaIds) ||
    mediaIds.length > 4 ||
    (body.length === 0 && mediaIds.length === 0)
  ) {
    return jsonResponse({ message: "[mock] Invalid create-post input" }, 400);
  }
  const media = (mediaIds as unknown[]).slice(0, 4).map((id, index) => {
    const uploaded = typeof id === "string" ? mockUploads.get(id) : undefined;
    return (
      uploaded ?? {
        kind: "image" as const,
        url: `https://picsum.photos/seed/new-${Date.now()}-${index}/800/600`,
      }
    );
  });
  return jsonResponse(
    {
      id: `feed-p-new-${Date.now().toString(36)}`,
      authorId: mockUsers[0]?.id ?? "u-1",
      body,
      media,
      likeCount: 0,
      likedByMe: false,
      createdAt: new Date().toISOString(),
    },
    201,
  );
}

function mockLikeResponse(id: string, bodyText: string | null): Response {
  const base = [...mockPosts, ...feedPosts].find((post) => post.id === id);
  if (!base || isPostGone(id)) return notFound("POST", `/posts/${id}/like`);
  if (id === FAIL_LIKE_POST_ID) {
    return jsonResponse({ message: "[mock] forced like failure" }, 500);
  }
  let liked = !base.likedByMe;
  try {
    const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "liked" in parsed &&
      typeof (parsed as { liked: unknown }).liked === "boolean"
    ) {
      liked = (parsed as { liked: boolean }).liked;
    }
  } catch {
    // Unknown body — keep the default toggle.
  }
  const likeCount = Math.max(0, base.likeCount + (liked === base.likedByMe ? 0 : liked ? 1 : -1));
  return jsonResponse({ ...base, likedByMe: liked, likeCount }, 200);
}

/** Default entity + feed mocks (used unless the caller overrides `routes`). */
function defaultEntityResponse(
  method: HttpMethod,
  path: string,
  query: Record<string, string>,
  bodyText: string | null,
): Response | null {
  if (method === "GET" && path === "/feed/home") {
    return feedPageResponse(query["cursor"] ?? null);
  }
  if (method === "GET" && (path === "/me" || path === "/users/me")) {
    return jsonResponse(mockUsers[0], 200);
  }
  if (method === "GET") {
    if (path === "/search") {
      return searchResponse(query["q"] ?? "", query["cursor"] ?? null);
    }
    if (path === "/trending") {
      return trendingResponse();
    }
    if (path === "/notifications") {
      return notificationsPageResponse(query["cursor"] ?? null);
    }
    if (path === "/notif-prefs") {
      return jsonResponse({ ...notifPrefsMock }, 200);
    }
    if (path === "/sessions") {
      return jsonResponse({ items: [...sessionStore] }, 200);
    }
    if (path === "/users/me/export") {
      return mockExportResponse();
    }
    if (path === "/conversations") {
      return conversationsPageResponse(query["cursor"] ?? null);
    }
    const conversationMessagesMatch = /^\/conversations\/([^/]+)\/messages$/.exec(path);
    if (conversationMessagesMatch?.[1]) {
      return chatMessagesPageResponse(
        decodeURIComponent(conversationMessagesMatch[1]),
        query["cursor"] ?? null,
      );
    }
    const conversationMatch = /^\/conversations\/([^/]+)$/.exec(path);
    if (conversationMatch?.[1]) {
      const item = conversationFixtures.find(
        (candidate) => candidate.id === decodeURIComponent(conversationMatch[1] ?? ""),
      );
      return item ? jsonResponse(item, 200) : notFound(method, path);
    }
    const presenceMatch = /^\/users\/([^/]+)\/presence$/.exec(path);
    if (presenceMatch?.[1]) {
      return mockPresenceResponse(decodeURIComponent(presenceMatch[1]));
    }
    const postCommentsMatch = /^\/posts\/([^/]+)\/comments$/.exec(path);
    if (postCommentsMatch?.[1]) {
      return postCommentsPageResponse(
        decodeURIComponent(postCommentsMatch[1]),
        query["cursor"] ?? null,
      );
    }
    const notificationMatch = /^\/notifications\/([^/]+)$/.exec(path);
    if (notificationMatch?.[1]) {
      const item = notificationsFixtures.find(
        (candidate) => candidate.id === decodeURIComponent(notificationMatch[1] ?? ""),
      );
      return item ? jsonResponse(item, 200) : notFound(method, path);
    }
    const relationshipMatch = /^\/users\/([^/]+)\/relationship$/.exec(path);
    if (relationshipMatch?.[1]) {
      return relationshipFor(decodeURIComponent(relationshipMatch[1]));
    }
    const followersMatch = /^\/users\/([^/]+)\/followers$/.exec(path);
    if (followersMatch?.[1]) {
      const id = decodeURIComponent(followersMatch[1]);
      if (!knownUserId(id)) return notFound(method, path);
      return followListResponse(followersOf(id), query["cursor"] ?? null);
    }
    const followingMatch = /^\/users\/([^/]+)\/following$/.exec(path);
    if (followingMatch?.[1]) {
      const id = decodeURIComponent(followingMatch[1]);
      if (!knownUserId(id)) return notFound(method, path);
      return followListResponse(followingOf(id), query["cursor"] ?? null);
    }
    if (path === "/follow-requests") {
      return followListResponse(pairStatesTo(ME_ID, "requested"), query["cursor"] ?? null);
    }
    if (path === "/saved") {
      return savedPageResponse(query["cursor"] ?? null);
    }
    const hashtagMatch = /^\/hashtag\/([^/]+)$/.exec(path);
    if (hashtagMatch?.[1]) {
      return hashtagPageResponse(decodeURIComponent(hashtagMatch[1]), query["cursor"] ?? null);
    }
    const handleMatch = /^\/users\/handle\/([^/]+)$/.exec(path);
    if (handleMatch?.[1]) {
      const want = decodeURIComponent(handleMatch[1]).toLowerCase();
      const user = [...mockUsers, ...feedAuthors].find(
        (candidate) => candidate.handle.toLowerCase() === want,
      );
      return user ? jsonResponse(user, 200) : notFound(method, path);
    }
    const postsMatch = /^\/users\/([^/]+)\/posts$/.exec(path);
    if (postsMatch?.[1]) {
      return userPostsPageResponse(decodeURIComponent(postsMatch[1]), query["cursor"] ?? null);
    }
    const { base, id } = splitIdPath(path);
    if (base === "/users" && id) {
      // Feed authors resolve too so notification actors hydrate (unknown ids still 404).
      const user = [...mockUsers, ...feedAuthors].find((candidate) => candidate.id === id);
      return user ? jsonResponse(user, 200) : notFound(method, path);
    }
    if (base === "/posts" && id) {
      if (isPostGone(id)) return notFound(method, path);
      const post =
        mockPosts.find((candidate) => candidate.id === id) ??
        feedPosts.find((candidate) => candidate.id === id);
      return post ? jsonResponse(post, 200) : notFound(method, path);
    }
    return null;
  }
  if (method === "POST") {
    // Receives the Expo push token after login; always ok, no body validation.
    if (path === "/devices") {
      return jsonResponse({ ok: true }, 200);
    }
    if (path === "/auth/change-password") {
      return mockChangePasswordResponse(bodyText);
    }
    if (path === "/users/me/deactivate") {
      return jsonResponse({ ok: true, deactivatedAt: new Date().toISOString() }, 200);
    }
    if (path === "/posts") {
      return mockCreatePostResponse(bodyText);
    }
    // Multipart upload target (F1.2 composer media). The client sends
    // `FormData`, so there is no JSON body to validate — always succeed.
    if (path === "/uploads") {
      return mockUploadResponse(query["kind"] === "video" ? "video" : "image");
    }
    const likeMatch = /^\/posts\/([^/]+)\/like$/.exec(path);
    if (likeMatch?.[1]) {
      return mockLikeResponse(decodeURIComponent(likeMatch[1]), bodyText);
    }
    const commentLikeMatch = /^\/comments\/([^/]+)\/like$/.exec(path);
    if (commentLikeMatch?.[1]) {
      return mockCommentLikeResponse(decodeURIComponent(commentLikeMatch[1]), bodyText);
    }
    const createCommentMatch = /^\/posts\/([^/]+)\/comments$/.exec(path);
    if (createCommentMatch?.[1]) {
      return mockCreateCommentResponse(decodeURIComponent(createCommentMatch[1]), bodyText);
    }
    const readMatch = /^\/notifications\/([^/]+)\/read$/.exec(path);
    if (readMatch?.[1]) {
      return mockMarkReadResponse(decodeURIComponent(readMatch[1]));
    }
    const sendMatch = /^\/conversations\/([^/]+)\/messages$/.exec(path);
    if (sendMatch?.[1]) {
      return mockSendMessageResponse(decodeURIComponent(sendMatch[1]), bodyText);
    }
    const convReadMatch = /^\/conversations\/([^/]+)\/read$/.exec(path);
    if (convReadMatch?.[1]) {
      return mockConversationReadResponse(decodeURIComponent(convReadMatch[1]));
    }
    if (path === "/reports") {
      return mockReportResponse(bodyText);
    }
    const safetyMatch = /^\/users\/([^/]+)\/(block|unblock|mute|unmute)$/.exec(path);
    if (safetyMatch?.[1] && safetyMatch?.[2]) {
      const userId = decodeURIComponent(safetyMatch[1]);
      const action = safetyMatch[2];
      if (action === "block") return mockSafetyResponse(userId, { blockedByMe: true });
      if (action === "unblock") return mockSafetyResponse(userId, { blockedByMe: false });
      if (action === "mute") return mockSafetyResponse(userId, { mutedByMe: true });
      return mockSafetyResponse(userId, { mutedByMe: false });
    }
    const followMatch = /^\/users\/([^/]+)\/(follow|unfollow)$/.exec(path);
    if (followMatch?.[1] && followMatch?.[2]) {
      const userId = decodeURIComponent(followMatch[1]);
      return followMatch[2] === "follow"
        ? mockFollowResponse(userId)
        : mockUnfollowResponse(userId);
    }
    const requestMatch = /^\/follow-requests\/([^/]+)\/(approve|reject)$/.exec(path);
    if (requestMatch?.[1] && requestMatch?.[2]) {
      const followerId = decodeURIComponent(requestMatch[1]);
      return requestMatch[2] === "approve"
        ? mockApproveResponse(followerId)
        : mockRejectResponse(followerId);
    }
    const savedMatch = /^\/saved\/([^/]+)$/.exec(path);
    if (savedMatch?.[1]) {
      return mockSavePostResponse(decodeURIComponent(savedMatch[1]));
    }
    return null;
  }
  if (method === "PATCH") {
    if (path === "/users/me" || path === "/me") {
      return mockUpdateProfileResponse(bodyText);
    }
    if (path === "/users/me/privacy") {
      return mockUpdatePrivacyResponse(bodyText);
    }
    if (path === "/notif-prefs") {
      return mockNotifPrefsResponse(bodyText);
    }
    const { base, id } = splitIdPath(path);
    if (base === "/posts" && id) {
      return mockUpdatePostResponse(id, bodyText);
    }
    return null;
  }
  if (method === "DELETE") {
    const sessionMatch = /^\/sessions\/([^/]+)$/.exec(path);
    if (sessionMatch?.[1]) {
      return mockRevokeSessionResponse(decodeURIComponent(sessionMatch[1]));
    }
    if (path === "/users/me") {
      return jsonResponse({ ok: true }, 200);
    }
    const savedMatch = /^\/saved\/([^/]+)$/.exec(path);
    if (savedMatch?.[1]) {
      return mockUnsavePostResponse(decodeURIComponent(savedMatch[1]));
    }
    const { base, id } = splitIdPath(path);
    if (base === "/posts" && id) {
      return mockDeletePostResponse(id);
    }
    return null;
  }
  return null;
}

export function createMockFetch(options: MockFetchOptions = {}): typeof fetch {
  const { delayMs = DEFAULT_DELAY_MS, routes } = options;
  const usingDefaults = routes === undefined;
  const activeRoutes = routes ?? defaultRoutes;

  return async function mockFetch(input, init): Promise<Response> {
    const method = (init?.method ?? "GET").toUpperCase() as HttpMethod;
    const path = requestPath(input);
    const query = requestQuery(input);
    const bodyText = requestBodyText(init);
    const route = activeRoutes.find(
      (candidate) => candidate.method === method && candidate.path === path,
    );

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (route) {
      return jsonResponse(await route.handler({ method, path, bodyText }), route.status ?? 200);
    }
    if (usingDefaults) {
      const entityResponse = defaultEntityResponse(method, path, query, bodyText);
      if (entityResponse) return entityResponse;
    }
    return notFound(method, path);
  };
}
