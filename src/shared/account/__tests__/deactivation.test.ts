/**
 * Tests for the G2.4 deactivation flag (kv-backed, never throws).
 */

import { clearDeactivated, isDeactivated, setDeactivated } from "../deactivation";

beforeEach(() => {
  clearDeactivated();
});

describe("deactivation flag", () => {
  it("starts clear, sets, and clears", () => {
    expect(isDeactivated()).toBe(false);
    setDeactivated();
    expect(isDeactivated()).toBe(true);
    clearDeactivated();
    expect(isDeactivated()).toBe(false);
  });
});
