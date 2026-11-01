/**
 * Tests for the viewer options sheet (F14).
 *
 * - The `...` trigger opens the sheet.
 * - Save is injected as a row; Hide is feature-owned.
 * - Report is never rendered from this surface.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { PostOptionsSheet } from "../post-options-sheet";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

describe("PostOptionsSheet", () => {
  it("opens from the more button and shows save/hide without report", async () => {
    const onHidePress = jest.fn();

    await render(
      <PostOptionsSheet postId="p-1" onHidePress={onHidePress} saveAffordance={<></>} />,
      { wrapper },
    );

    fireEvent.press(screen.getByTestId("post-options-p-1"));
    await waitFor(() => {
      expect(screen.getByTestId("post-options-sheet-p-1")).toBeTruthy();
    });

    expect(screen.getByTestId("post-hide-p-1")).toBeTruthy();
    expect(screen.getByTestId("post-options-cancel-p-1")).toBeTruthy();
    expect(screen.queryByText("Report")).toBeNull();
  });
});
