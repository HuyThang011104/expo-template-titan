/**
 * Tests for `shared/storage/db` migration metadata. The native driver
 * itself is not exercised in Jest (no sqlite module in this environment).
 */

import { MIGRATIONS } from "../migrations";

describe("migrations", () => {
  it("declares strictly ascending versions starting at 1 with non-empty SQL", () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    let previous = 0;
    for (const migration of MIGRATIONS) {
      expect(migration.version).toBe(previous + 1);
      expect(migration.sql.trim().length).toBeGreaterThan(0);
      previous = migration.version;
    }
  });
});
