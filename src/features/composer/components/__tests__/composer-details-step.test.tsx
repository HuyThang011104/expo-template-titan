/**
 * Tests for the P2 composer details step: caption input, counter, media edit
 * action, and inline status rows.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ComposerDetailsStep } from "../composer-details-step";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

const baseProps = {
  displayName: "Ava Stone",
  avatarUrl: null,
  body: "Hello",
  onChangeBody: jest.fn(),
  uris: [],
  onRemoveMedia: jest.fn(),
  hasMedia: false,
  onChangeMedia: jest.fn(),
  maxLength: 280,
  trimmedLength: 5,
  busy: false,
  isUploading: false,
  showRepickNote: false,
  error: null,
  queued: false,
};

describe("ComposerDetailsStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the caption input and counter", async () => {
    await render(<ComposerDetailsStep {...baseProps} trimmedLength={265} />, { wrapper });

    expect(screen.getByTestId("composer-step-details")).toBeTruthy();
    expect(screen.getByTestId("composer-input").props.value).toBe("Hello");
    expect(screen.getByTestId("composer-counter")).toBeTruthy();
  });

  it("forwards body changes and the media edit action", async () => {
    await render(<ComposerDetailsStep {...baseProps} />, { wrapper });

    fireEvent.changeText(screen.getByTestId("composer-input"), "Hello world");
    await waitFor(() => {
      expect(baseProps.onChangeBody).toHaveBeenCalledWith("Hello world");
    });

    fireEvent.press(screen.getByTestId("composer-edit-media-button"));
    await waitFor(() => {
      expect(baseProps.onChangeMedia).toHaveBeenCalledTimes(1);
    });
  });

  it("shows inline upload, repick, error, and queued states", async () => {
    await render(
      <ComposerDetailsStep
        {...baseProps}
        isUploading
        showRepickNote
        error="Nope"
        queued
      />,
      { wrapper },
    );

    await screen.findByTestId("composer-uploading");
    expect(screen.getByTestId("composer-repick-note")).toBeTruthy();
    expect(screen.getByTestId("composer-error")).toBeTruthy();
    expect(screen.getByTestId("composer-queued-badge")).toBeTruthy();
  });
});
