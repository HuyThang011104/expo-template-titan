/**
 * Tests for `ComposerMediaStrip` (preview + per-thumb remove, image + video).
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { PickedMedia } from "../../../../shared/media";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ComposerMediaStrip } from "../composer-media-strip";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

function image(uri: string): PickedMedia {
  return { uri, width: 100, height: 100, kind: "image", mimeType: "image/jpeg" };
}

function video(uri: string, duration = 65_000): PickedMedia {
  return { uri, width: 1280, height: 720, kind: "video", mimeType: "video/mp4", duration };
}

describe("ComposerMediaStrip", () => {
  it("renders nothing without items", async () => {
    await render(<ComposerMediaStrip items={[]} onRemove={() => {}} />, { wrapper });
    expect(screen.queryByTestId("composer-media-strip")).toBeNull();
  });

  it("renders one thumb per item with testIDs", async () => {
    await render(
      <ComposerMediaStrip
        items={[image("file:///a.jpg"), image("file:///b.jpg")]}
        onRemove={() => {}}
      />,
      { wrapper },
    );
    expect(screen.getByTestId("composer-media-strip")).toBeTruthy();
    expect(screen.getByTestId("composer-media-thumb-0")).toBeTruthy();
    expect(screen.getByTestId("composer-media-thumb-1")).toBeTruthy();
    expect(screen.queryByTestId("composer-media-thumb-2")).toBeNull();
  });

  it("renders a video placeholder with its duration", async () => {
    await render(<ComposerMediaStrip items={[video("file:///v.mp4")]} onRemove={() => {}} />, {
      wrapper,
    });
    expect(screen.getByTestId("composer-media-video-0")).toBeTruthy();
    expect(screen.getByLabelText("Video 1, 1:05")).toBeTruthy();
    expect(screen.getByText("1:05")).toBeTruthy();
  });

  it("remove button reports its index", async () => {
    const onRemove = jest.fn();
    await render(
      <ComposerMediaStrip
        items={[image("file:///a.jpg"), image("file:///b.jpg")]}
        onRemove={onRemove}
      />,
      { wrapper },
    );
    fireEvent.press(screen.getByTestId("composer-media-remove-1"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
