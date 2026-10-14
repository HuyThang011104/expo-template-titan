/**
 * Tests for `FollowButton` (G1.1 entity UI).
 *
 * - Shows Follow/Following/Requested from the canonical relationship.
 * - Tap toggles through the optimistic cache; forced-failure ids keep
 *   the old label and show the inline error.
 * - The canonical entry is seeded before render so taps never race the
 *   initial relationship fetch (the button locks while that loads).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { fetchRelationship } from "../../api-relationship";
import { setRelationship } from "../../relationship-cache";
import { FollowButton } from "../follow-button";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function setup() {
  const qc = createQueryClient();
  const fetchImpl = createMockFetch({ delayMs: 0 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    </QueryClientProvider>
  );
  return { qc, fetchImpl, wrapper };
}

describe("FollowButton", () => {
  it("toggles Follow to Following on tap", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const seeded = await fetchRelationship("u-feed-7", { fetchImpl });
    if (!seeded) throw new Error("setup failed: missing relationship");
    setRelationship(qc, seeded);

    await render(<FollowButton userId="u-feed-7" fetchImpl={fetchImpl} />, { wrapper });
    expect(screen.getByText("Follow")).toBeTruthy();

    fireEvent.press(screen.getByTestId("follow-button-u-feed-7"));

    await waitFor(() => {
      expect(screen.getByText("Following")).toBeTruthy();
    });
  });

  it("shows Requested for the private fixture", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const seeded = await fetchRelationship("u-feed-5", { fetchImpl });
    if (!seeded) throw new Error("setup failed: missing relationship");
    setRelationship(qc, seeded);

    await render(<FollowButton userId="u-feed-5" fetchImpl={fetchImpl} />, { wrapper });
    expect(screen.getByText("Follow")).toBeTruthy();

    fireEvent.press(screen.getByTestId("follow-button-u-feed-5"));

    await waitFor(() => {
      expect(screen.getByText("Requested")).toBeTruthy();
    });
  });

  it("keeps the old label and shows an inline error on failure", async () => {
    const { fetchImpl, wrapper } = setup();
    await render(<FollowButton userId="nope" fetchImpl={fetchImpl} />, { wrapper });

    // Wait out the failing relationship fetch (button locks while loading).
    await waitFor(() => {
      expect(
        screen.getByTestId("follow-button-nope").props.accessibilityState.busy,
      ).toBe(false);
    });
    expect(screen.getByText("Follow")).toBeTruthy();

    fireEvent.press(screen.getByTestId("follow-button-nope"));

    await waitFor(() => {
      expect(screen.getByTestId("follow-error-nope")).toBeTruthy();
    });
    expect(screen.getByText("Follow")).toBeTruthy();
  });
});
