/**
 * Tests for the composer media step: photo/video actions, preview strip,
 * selection count, limits, and the text-only shortcut.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { PickedMedia } from "../../../../shared/media";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ComposerMediaStep } from "../composer-media-step";

// `expo-image` schedules transition timers; stub it so multiple renders in one
// file cannot leak act() scopes into the next test.
jest.mock("expo-image", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

function image(uri: string): PickedMedia {
  return { uri, width: 100, height: 100, kind: "image", mimeType: "image/jpeg" };
}

function video(uri: string): PickedMedia {
  return { uri, width: 1280, height: 720, kind: "video", mimeType: "video/mp4", duration: 1500 };
}

const baseProps = {
  maxMedia: 4,
  canAddImages: true,
  canAddVideo: true,
  onAddImages: jest.fn(),
  onTakePhoto: jest.fn(),
  onAddVideo: jest.fn(),
  onRecordVideo: jest.fn(),
  onRemove: jest.fn(),
  onTextOnly: jest.fn(),
};

describe("ComposerMediaStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders photo/video actions and the text-only shortcut when empty", async () => {
    await render(<ComposerMediaStep items={[]} {...baseProps} />, { wrapper });

    expect(screen.getByTestId("composer-step-media")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Add media" })).toBeTruthy();
    expect(screen.getByText("Add media")).toBeTruthy();
    expect(screen.getByText("0/4 selected")).toBeTruthy();
    expect(screen.getByTestId("composer-media-add")).toBeTruthy();
    expect(screen.getByTestId("composer-camera")).toBeTruthy();
    expect(screen.getByTestId("composer-media-video-add")).toBeTruthy();
    expect(screen.getByTestId("composer-media-video-record")).toBeTruthy();
    expect(screen.getByTestId("composer-text-only-button")).toBeTruthy();
  });

  it("shows the photo cap and hides video/text-only actions", async () => {
    await render(
      <ComposerMediaStep
        items={[
          image("file:///a.jpg"),
          image("file:///b.jpg"),
          image("file:///c.jpg"),
          image("file:///d.jpg"),
        ]}
        {...baseProps}
        canAddImages={false}
        canAddVideo={false}
      />,
      { wrapper },
    );

    expect(screen.getByText("4/4 selected")).toBeTruthy();
    expect(screen.queryByTestId("composer-media-video-add")).toBeNull();
    expect(screen.queryByTestId("composer-text-only-button")).toBeNull();
  });

  it("reports the selected video and hides photo actions", async () => {
    await render(
      <ComposerMediaStep
        items={[video("file:///v.mp4")]}
        {...baseProps}
        canAddImages={false}
        canAddVideo={false}
      />,
      { wrapper },
    );

    expect(screen.getByText("1 video selected")).toBeTruthy();
    expect(screen.getByTestId("composer-media-video-0")).toBeTruthy();
    expect(screen.queryByTestId("composer-media-add")).toBeNull();
    expect(screen.queryByTestId("composer-text-only-button")).toBeNull();
  });

  it("shows an inline media limit error", async () => {
    await render(
      <ComposerMediaStep items={[]} {...baseProps} error="Video must be 90 seconds or shorter." />,
      { wrapper },
    );
    expect(await screen.findByTestId("composer-media-limit-error")).toBeTruthy();
  });

  it("forwards pick, record, and text-only actions", async () => {
    await render(<ComposerMediaStep items={[]} {...baseProps} />, { wrapper });

    fireEvent.press(screen.getByTestId("composer-text-only-button"));
    fireEvent.press(screen.getByTestId("composer-media-add"));
    fireEvent.press(screen.getByTestId("composer-camera"));
    fireEvent.press(screen.getByTestId("composer-media-video-add"));
    fireEvent.press(screen.getByTestId("composer-media-video-record"));

    await waitFor(() => {
      expect(baseProps.onTextOnly).toHaveBeenCalledTimes(1);
      expect(baseProps.onAddImages).toHaveBeenCalledTimes(1);
      expect(baseProps.onTakePhoto).toHaveBeenCalledTimes(1);
      expect(baseProps.onAddVideo).toHaveBeenCalledTimes(1);
      expect(baseProps.onRecordVideo).toHaveBeenCalledTimes(1);
    });
  });
});
