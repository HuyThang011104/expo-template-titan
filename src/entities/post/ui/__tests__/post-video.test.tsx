/**
 * Tests for `entities/post/ui/post-video`.
 *
 * - Stubs the shared player so no native `expo-video` runs in Jest.
 * - Covers: active/idle `shouldPlay`, manual pause toggle, mute toggle.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { PostVideo } from "../post-video";

const mockSharedProps: { shouldPlay?: boolean; muted?: boolean }[] = [];

jest.mock("@/shared/ui/video/video-view", () => {
  const RN = jest.requireActual("react-native");
  return {
    SharedVideoView: (props: { shouldPlay: boolean; muted: boolean }) => {
      mockSharedProps.push({ shouldPlay: props.shouldPlay, muted: props.muted });
      return <RN.View testID="stub-shared-video" />;
    },
  };
});

function renderWithTheme(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

describe("PostVideo", () => {
  beforeEach(() => {
    mockSharedProps.length = 0;
  });

  it("autoplays when active", async () => {
    await renderWithTheme(
      <PostVideo postId="feed-p-5" mediaUrl="https://example.com/a.mp4" isActive />,
    );
    expect(screen.getByTestId("post-video-feed-p-5")).toBeTruthy();
    expect(mockSharedProps.at(-1)).toMatchObject({ shouldPlay: true, muted: true });
  });

  it("stays idle when not active", async () => {
    await renderWithTheme(
      <PostVideo postId="feed-p-5" mediaUrl="https://example.com/a.mp4" isActive={false} />,
    );
    expect(mockSharedProps.at(-1)).toMatchObject({ shouldPlay: false });
  });

  it("manual toggle pauses and mute unmutes", async () => {
    await renderWithTheme(
      <PostVideo postId="feed-p-5" mediaUrl="https://example.com/a.mp4" isActive />,
    );
    expect(View).toBeTruthy();
    fireEvent.press(screen.getByTestId("video-toggle-feed-p-5"));
    await waitFor(() => {
      expect(mockSharedProps.at(-1)).toMatchObject({ shouldPlay: false });
    });
    fireEvent.press(screen.getByTestId("video-mute-feed-p-5"));
    await waitFor(() => {
      expect(mockSharedProps.at(-1)).toMatchObject({ muted: false });
    });
  });
});
