/**
 * Tests for `entities/post/ui/post-video`.
 *
 * - Stubs the shared player so no native `expo-video` runs in Jest.
 * - Covers: active/idle `shouldPlay`, manual pause toggle, mute toggle, and
 *   the PF2.2 overlay contract (token icons, a11y labels, no glyph text).
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

  it("manual toggle pauses and mute unmutes, updating a11y labels", async () => {
    await renderWithTheme(
      <PostVideo postId="feed-p-5" mediaUrl="https://example.com/a.mp4" isActive />,
    );
    expect(View).toBeTruthy();

    const toggle = screen.getByTestId("video-toggle-feed-p-5");
    expect(toggle.props.accessibilityLabel).toBe("Pause video");

    fireEvent.press(toggle);
    await waitFor(() => {
      expect(mockSharedProps.at(-1)).toMatchObject({ shouldPlay: false });
    });
    expect(screen.getByTestId("video-toggle-feed-p-5").props.accessibilityLabel).toBe(
      "Play video",
    );

    const mute = screen.getByTestId("video-mute-feed-p-5");
    expect(mute.props.accessibilityLabel).toBe("Unmute");

    fireEvent.press(mute);
    await waitFor(() => {
      expect(mockSharedProps.at(-1)).toMatchObject({ muted: false });
    });
    expect(screen.getByTestId("video-mute-feed-p-5").props.accessibilityLabel).toBe("Mute");
  });

  it("renders no glyph controls", async () => {
    await renderWithTheme(
      <PostVideo postId="feed-p-5" mediaUrl="https://example.com/a.mp4" isActive />,
    );

    expect(screen.queryByText("▶")).toBeNull();
    expect(screen.queryByText("❚❚")).toBeNull();
    expect(screen.queryByText("🔇")).toBeNull();
    expect(screen.queryByText("🔊")).toBeNull();
  });
});
