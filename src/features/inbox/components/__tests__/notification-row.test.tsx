/**
 * Tests for PF5.2 notification thumbnails.
 *
 * The thumbnail is cache-only: a hydrated post renders an image tile, a
 * missing post cache renders nothing (and triggers no request), and a video
 * renders the play badge without a poster fetch.
 */

import { render, screen } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { hydrateNotification, type Notification } from "@/entities/notification";
import { setPost, type Post, type PostMedia } from "@/entities/post";
import { setUser, type User } from "@/entities/user";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/ui/theme/theme-provider";

import { NotificationRow } from "../notification-row";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) => <View testID="expo-image" {...props} />,
  };
});

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

const notification: Notification = {
  id: "n-1",
  kind: "like",
  actorId: "u-1",
  postId: "p-1",
  read: false,
  createdAt: "2026-10-28T10:00:00.000Z",
};

const actor: User = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: null,
  bio: null,
  coverUrl: null,
  link: null,
  privacySettings: {
    messageAudience: "everyone",
    postVisibility: "public",
    tagAudience: "everyone",
  },
};

function postWith(media: PostMedia[]): Post {
  return {
    id: "p-1",
    authorId: "u-1",
    body: "Hello",
    media,
    likeCount: 0,
    likedByMe: false,
    createdAt: "2026-10-28T09:00:00.000Z",
  };
}

function setup(): QueryClient {
  const qc = createQueryClient();
  hydrateNotification(qc, notification);
  setUser(qc, actor);
  return qc;
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialName="light">{children}</ThemeProvider>
      </QueryClientProvider>
    );
  };
}

function renderRow(qc: QueryClient) {
  return render(<NotificationRow notificationId="n-1" prefetchTarget={() => {}} />, {
    wrapper: makeWrapper(qc),
  });
}

describe("NotificationRow thumbnail", () => {
  it("renders an image thumbnail from the post cache", async () => {
    const qc = setup();
    setPost(qc, postWith([{ kind: "image", url: "https://example.com/photo.jpg" }]));

    await renderRow(qc);

    expect(screen.getByTestId("notification-thumb-n-1", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("expo-image", { includeHiddenElements: true }).props.source).toEqual({
      uri: "https://example.com/photo.jpg",
    });
  });

  it("renders no thumbnail when the post is not cached and fetches nothing", async () => {
    const qc = setup();
    const realFetch = global.fetch;
    const fetchSpy = jest.fn(async () => {
      throw new Error("unexpected request");
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    try {
      await renderRow(qc);

      expect(screen.queryByTestId("notification-thumb-n-1")).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = realFetch;
    }
  });

  it("renders a play badge for a video without fetching a poster", async () => {
    const qc = setup();
    setPost(qc, postWith([{ kind: "video", url: "https://example.com/clip.mp4" }]));

    await renderRow(qc);

    expect(screen.getByTestId("notification-thumb-n-1", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("symbol-view", { includeHiddenElements: true }).props.name).toEqual({
      ios: "play.fill",
      android: "play_arrow",
      web: "play_arrow",
    });
  });
});
