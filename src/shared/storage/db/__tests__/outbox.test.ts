/**
 * Tests for `shared/storage/db` outbox. The native driver is faked —
 * only SQL call shapes + worker accounting are asserted here.
 */

import type * as SQLite from "expo-sqlite";

import { getDatabase } from "../client";
import {
  OUTBOX_MAX_ATTEMPTS,
  enqueueOutboxJob,
  listPendingJobs,
  markJobAttemptFailed,
  markJobSent,
  statusAfterFailure,
} from "../outbox";
import { drainOutbox } from "../outbox-worker";

jest.mock("../client", () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.Mock;

function makeFakeDb(overrides: { runAsync?: jest.Mock; getAllAsync?: jest.Mock } = {}) {
  return {
    runAsync: overrides.runAsync ?? jest.fn(async () => {}),
    getAllAsync: overrides.getAllAsync ?? jest.fn(async () => []),
  } as unknown as SQLite.SQLiteDatabase;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("statusAfterFailure", () => {
  it(`retries below the cap of ${OUTBOX_MAX_ATTEMPTS}, dead-letters at it`, () => {
    expect(statusAfterFailure(0)).toBe("pending");
    expect(statusAfterFailure(OUTBOX_MAX_ATTEMPTS - 1)).toBe("pending");
    expect(statusAfterFailure(OUTBOX_MAX_ATTEMPTS)).toBe("dead");
  });
});

describe("enqueueOutboxJob", () => {
  it("validates kind and payload", async () => {
    mockedGetDatabase.mockResolvedValue(makeFakeDb());
    await expect(enqueueOutboxJob("bad kind!", "{}")).rejects.toThrow();
    await expect(enqueueOutboxJob("chat.send", "")).rejects.toThrow();
  });

  it("inserts a pending row and returns its id", async () => {
    const runAsync = jest.fn(async () => {});
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ runAsync }));
    const id = await enqueueOutboxJob("chat.send", '{"text":"hi"}');
    expect(typeof id).toBe("string");
    expect(runAsync).toHaveBeenCalledTimes(1);
    const calls = runAsync.mock.calls as unknown[][];
    expect(calls[0]?.[0]).toContain("INSERT INTO outbox");
    expect(calls[0]?.[2]).toBe("chat.send");
  });
});

describe("markJobSent / markJobAttemptFailed", () => {
  it("deletes on success", async () => {
    const runAsync = jest.fn(async () => {});
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ runAsync }));
    await markJobSent("j1");
    expect(runAsync).toHaveBeenCalledWith("DELETE FROM outbox WHERE id = ?", "j1");
  });

  it("bumps attempts and dead-letters at the cap", async () => {
    const runAsync = jest.fn(async () => {});
    const getAllAsync = jest.fn(async () => [{ attempts: OUTBOX_MAX_ATTEMPTS - 1 }]);
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ runAsync, getAllAsync }));
    await expect(markJobAttemptFailed("j1")).resolves.toBe("dead");
    expect(runAsync).toHaveBeenCalledTimes(1);
  });
});

describe("listPendingJobs", () => {
  it("maps rows oldest-first", async () => {
    const getAllAsync = jest.fn(async () => [
      {
        id: "j1",
        kind: "chat.send",
        payload: "{}",
        status: "pending",
        attempts: 0,
        created_at: 1,
        updated_at: 1,
      },
    ]);
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ getAllAsync }));
    const jobs = await listPendingJobs(10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: "j1", attempts: 0, createdAt: 1 });
  });
});

describe("drainOutbox", () => {
  const rows = [
    {
      id: "ok",
      kind: "chat.send",
      payload: '{"text":"hi"}',
      status: "pending",
      attempts: 0,
      created_at: 1,
      updated_at: 1,
    },
    {
      id: "flaky",
      kind: "chat.send",
      payload: '{"text":"yo"}',
      status: "pending",
      attempts: 1,
      created_at: 2,
      updated_at: 2,
    },
  ];

  it("sends, deletes successes, and accounts retries", async () => {
    const runAsync = jest.fn(async () => {});
    const getAllAsync = jest.fn(async () => rows);
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ runAsync, getAllAsync }));

    const sender = jest.fn(async (job: { id: string }) => {
      if (job.id === "flaky") throw new Error("offline");
    });
    const result = await drainOutbox(sender);

    expect(sender).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 1, retried: 1, dead: 0 });
    expect(runAsync).toHaveBeenCalledWith("DELETE FROM outbox WHERE id = ?", "ok");
  });

  it("never throws when the database fails", async () => {
    const getAllAsync = jest.fn(async (): Promise<never[]> => {
      throw new Error("disk gone");
    });
    mockedGetDatabase.mockResolvedValue(makeFakeDb({ getAllAsync }));
    await expect(drainOutbox(async () => {})).resolves.toEqual({ sent: 0, retried: 0, dead: 0 });
  });
});
