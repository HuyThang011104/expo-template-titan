/**
 * Tests for F1.2 `ComposerMediaStrip` (preview + per-thumb remove).
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ComposerMediaStrip } from "../composer-media-strip";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

describe("ComposerMediaStrip", () => {
  it("renders nothing without uris", async () => {
    await render(<ComposerMediaStrip uris={[]} onRemove={() => {}} />, { wrapper });
    expect(screen.queryByTestId("composer-media-strip")).toBeNull();
  });

  it("renders one thumb per uri with testIDs", async () => {
    await render(
      <ComposerMediaStrip uris={["file:///a.jpg", "file:///b.jpg"]} onRemove={() => {}} />,
      { wrapper },
    );
    expect(screen.getByTestId("composer-media-strip")).toBeTruthy();
    expect(screen.getByTestId("composer-media-thumb-0")).toBeTruthy();
    expect(screen.getByTestId("composer-media-thumb-1")).toBeTruthy();
    expect(screen.queryByTestId("composer-media-thumb-2")).toBeNull();
  });

  it("remove button reports its index", async () => {
    const onRemove = jest.fn();
    await render(
      <ComposerMediaStrip uris={["file:///a.jpg", "file:///b.jpg"]} onRemove={onRemove} />,
      { wrapper },
    );
    fireEvent.press(screen.getByTestId("composer-media-remove-1"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
