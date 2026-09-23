/**
 * Tests for `shared/query/persist` policy + storage adapter.
 * The real persister is not started here (it would touch sqlite).
 */

import { deleteDraft, loadDraft, saveDraft } from "../../storage/db/drafts";
import { queryPersistStorage, shouldPersistQueryKey } from "../persist";

jest.mock("../../storage/db/drafts", () => ({
  saveDraft: jest.fn(async () => {}),
  loadDraft: jest.fn(async () => null),
  deleteDraft: jest.fn(async () => {}),
}));

const mockedSave = saveDraft as jest.Mock;
const mockedLoad = loadDraft as jest.Mock;
const mockedDelete = deleteDraft as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
});

describe("shouldPersistQueryKey", () => {
  it("persists identity/profile keys only", () => {
    expect(shouldPersistQueryKey(["session"])).toBe(true);
    expect(shouldPersistQueryKey(["me"])).toBe(true);
    expect(shouldPersistQueryKey(["users", "u1"])).toBe(true);
    expect(shouldPersistQueryKey(["feed", "home", ""])).toBe(false);
    expect(shouldPersistQueryKey(["posts", "p1"])).toBe(false);
    expect(shouldPersistQueryKey([])).toBe(false);
  });
});

describe("queryPersistStorage", () => {
  it("delegates to the drafts store", async () => {
    mockedLoad.mockResolvedValue("cached");
    await expect(queryPersistStorage.getItem("k")).resolves.toBe("cached");
    await queryPersistStorage.setItem("k", "v");
    await queryPersistStorage.removeItem("k");
    expect(mockedSave).toHaveBeenCalledWith("k", "v");
    expect(mockedDelete).toHaveBeenCalledWith("k");
  });
});
