/**
 * Tests for the P2 composer media step: pick actions, preview strip,
 * selection count, cap, and the text-only shortcut.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ComposerMediaStep } from "../composer-media-step";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

const baseProps = {
  maxMedia: 4,
  canAddMore: true,
  onAdd: jest.fn(),
  onTakePhoto: jest.fn(),
  onRemove: jest.fn(),
  onTextOnly: jest.fn(),
};

describe("ComposerMediaStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders pick actions and the text-only shortcut when empty", async () => {
    await render(<ComposerMediaStep uris={[]} {...baseProps} />, { wrapper });

    expect(screen.getByTestId("composer-step-media")).toBeTruthy();
    expect(screen.getByText("Add photos")).toBeTruthy();
    expect(screen.getByText("0/4 selected")).toBeTruthy();

    fireEvent.press(screen.getByTestId("composer-text-only-button"));
    expect(baseProps.onTextOnly).toHaveBeenCalledTimes(1);
  });

  it("disables add actions at the cap and hides the text-only shortcut", async () => {
    await render(
      <ComposerMediaStep
        uris={["file:///a.jpg", "file:///b.jpg", "file:///c.jpg", "file:///d.jpg"]}
        {...baseProps}
        canAddMore={false}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("composer-media-add")).toBeDisabled();
    expect(screen.getByTestId("composer-camera")).toBeDisabled();
    expect(screen.queryByTestId("composer-text-only-button")).toBeNull();
    expect(screen.getByText("4/4 selected")).toBeTruthy();
  });

  it("forwards add, camera, and remove presses", async () => {
    await render(<ComposerMediaStep uris={["file:///a.jpg"]} {...baseProps} />, { wrapper });

    fireEvent.press(screen.getByTestId("composer-media-add"));
    fireEvent.press(screen.getByTestId("composer-camera"));
    fireEvent.press(screen.getByTestId("composer-media-remove-0"));

    expect(baseProps.onAdd).toHaveBeenCalledTimes(1);
    expect(baseProps.onTakePhoto).toHaveBeenCalledTimes(1);
    expect(baseProps.onRemove).toHaveBeenCalledWith(0);
  });
});
