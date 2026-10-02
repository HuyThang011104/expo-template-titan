/**
 * Tests for `shared/ui/video`.
 *
 * - Mocks `expo-video` + `expo/useEvent` so no native player runs in Jest.
 * - Covers: shouldPlay syncs play/pause, error fallback.
 */

import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { ThemeProvider } from "../../theme/theme-provider";
import { SharedVideoView } from "../video-view";

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockPlayer = { play: mockPlay, pause: mockPause, loop: false, muted: true, status: "readyToPlay" };
const mockUseVideoPlayer = jest.fn(() => mockPlayer);
const mockUseEvent = jest.fn(() => ({ status: "readyToPlay", isPlaying: false }));

jest.mock("expo-video", () => {
  const React = jest.requireActual("react");
  const RN = jest.requireActual("react-native");
  return {
    useVideoPlayer: (...args: unknown[]) =>
      (mockUseVideoPlayer as (...a: unknown[]) => unknown)(...args),
    VideoView: () => React.createElement(RN.View, { testID: "stub-video-view" }),
  };
});

jest.mock("expo", () => {
  const actual = jest.requireActual("expo");
  return {
    ...actual,
    useEvent: (...args: unknown[]) =>
      (mockUseEvent as (...a: unknown[]) => unknown)(...args),
  };
});

async function renderWithTheme(ui: React.ReactElement) {
  await render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

describe("SharedVideoView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvent.mockReturnValue({ status: "readyToPlay", isPlaying: false });
  });

  it("plays when shouldPlay is true", async () => {
    await renderWithTheme(<SharedVideoView uri="https://example.com/a.mp4" shouldPlay />);
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalled();
    });
    expect(screen.getByTestId("stub-video-view")).toBeTruthy();
  });

  it("pauses when shouldPlay is false", async () => {
    await renderWithTheme(<SharedVideoView uri="https://example.com/a.mp4" shouldPlay={false} />);
    await waitFor(() => {
      expect(mockPause).toHaveBeenCalled();
    });
  });

  it("renders error fallback when status is error", async () => {
    mockUseEvent.mockReturnValue({ status: "error", isPlaying: false });
    await renderWithTheme(
      <SharedVideoView uri="https://example.com/a.mp4" shouldPlay testID="vid" />,
    );
    expect(screen.getByText("Video unavailable")).toBeTruthy();
  });
});
