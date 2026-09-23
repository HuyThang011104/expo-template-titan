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
  },
  {
    id: "u-2",
    handle: "liam",
    displayName: "Liam Carter",
    avatarUrl: null,
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
 * Deterministic feed mock (40 posts / 8 users, page 10).
 * `post-fail` sits at index 7 for first-page rollback tests.
 */
const FEED_PAGE_SIZE = 10;

type FeedMockAuthor = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
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
  },
  {
    id: "u-feed-4",
    handle: "noah",
    displayName: "Noah Kim",
    avatarUrl: "https://picsum.photos/seed/ufeed4/200",
  },
  {
    id: "u-feed-5",
    handle: "ella",
    displayName: "Ella Brooks",
    avatarUrl: null,
  },
  {
    id: "u-feed-6",
    handle: "lucas",
    displayName: "Lucas Gray",
    avatarUrl: "https://picsum.photos/seed/ufeed6/200",
  },
  {
    id: "u-feed-7",
    handle: "sofia",
    displayName: "Sofia Reed",
    avatarUrl: "https://picsum.photos/seed/ufeed7/200",
  },
  {
    id: "u-feed-8",
    handle: "ethan",
    displayName: "Ethan Cole",
    avatarUrl: "https://picsum.photos/seed/ufeed8/200",
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

function buildFeedPosts(): FeedMockPost[] {
  const posts: FeedMockPost[] = [];
  const baseTime = Date.parse("2026-09-09T10:00:00.000Z");
  for (let i = 1; i <= 39; i++) {
    const author = feedAuthors[i % feedAuthors.length] ?? feedAuthors[0];
    const hasMedia = i % 3 !== 0;
    const isVideo = i === 5;
    posts.push({
      id: `feed-p-${i}`,
      authorId: author.id,
      body: `Feed post #${i} — pagination and cross-cache like tests.`,
      media: !hasMedia
        ? []
        : isVideo
          ? [{ kind: "video", url: "https://picsum.photos/seed/feed-video-5/800/600" }]
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

function feedPageResponse(cursor: string | null): Response {
  let offset = 0;
  if (cursor !== null) {
    const parsed = Number.parseInt(cursor, 10);
    if (Number.isInteger(parsed) && parsed >= 0) offset = parsed;
  }
  const items = feedPosts.slice(offset, offset + FEED_PAGE_SIZE).map((post) => ({
    post,
    author: feedAuthors.find((author) => author.id === post.authorId) ?? feedAuthors[0],
  }));
  const next = offset + FEED_PAGE_SIZE;
  return jsonResponse(
    { items, nextCursor: next < feedPosts.length ? String(next) : null },
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

function mockLikeResponse(id: string, bodyText: string | null): Response {
  const base = [...mockPosts, ...feedPosts].find((post) => post.id === id);
  if (!base) return notFound("POST", `/posts/${id}/like`);
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
  if (method === "GET" && path === "/me") {
    return jsonResponse(mockUsers[0], 200);
  }
  if (method === "GET") {
    const { base, id } = splitIdPath(path);
    if (base === "/users" && id) {
      const user = mockUsers.find((candidate) => candidate.id === id);
      return user ? jsonResponse(user, 200) : notFound(method, path);
    }
    if (base === "/posts" && id) {
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
    const likeMatch = /^\/posts\/([^/]+)\/like$/.exec(path);
    if (likeMatch?.[1]) {
      return mockLikeResponse(decodeURIComponent(likeMatch[1]), bodyText);
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
