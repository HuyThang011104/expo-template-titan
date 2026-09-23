/**
 * Tests for `shared/realtime` pure units + socket dispatch (injected fake socket).
 */

import {
  channelForConversation,
  channelForPost,
  channelForUser,
  feedChannel,
  isKnownEventType,
} from "../channels";
import { RealtimeSocket, parseMessage } from "../socket";

function makeFakeSocket() {
  const sent: string[] = [];
  const socket = {
    readyState: 0,
    onopen: null as (() => void) | null,
    onmessage: null as ((event: { data: unknown }) => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as (() => void) | null,
    send: jest.fn((data: string) => {
      sent.push(data);
    }),
    close: jest.fn(),
  };
  return { socket, sent };
}

describe("channels", () => {
  it("builds namespaced channel names", () => {
    expect(channelForPost("p1")).toBe("post:p1");
    expect(channelForConversation("c1")).toBe("conversation:c1");
    expect(channelForUser("u1")).toBe("user:u1");
    expect(feedChannel()).toBe("feed:home");
  });

  it("recognizes known event types only", () => {
    expect(isKnownEventType("post.updated")).toBe(true);
    expect(isKnownEventType("whatever")).toBe(false);
  });
});

describe("parseMessage", () => {
  it("parses JSON strings with channel + type", () => {
    expect(parseMessage(JSON.stringify({ channel: "post:1", type: "post.updated" }))).toEqual({
      channel: "post:1",
      type: "post.updated",
      payload: undefined,
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseMessage("not json")).toBeNull();
    expect(parseMessage(null)).toBeNull();
    expect(parseMessage({ channel: "post:1" })).toBeNull();
    expect(parseMessage({ type: "x" })).toBeNull();
  });
});

describe("RealtimeSocket dispatch", () => {
  it("routes events to channel subscribers and wildcards", async () => {
    const { socket } = makeFakeSocket();
    const sut = new RealtimeSocket({
      createSocket: () => socket as unknown as WebSocket,
      getToken: async () => null,
    });
    const seen: string[] = [];
    const unsubChannel = sut.subscribe("post:1", (event) => seen.push(`post:${event.type}`));
    const unsubWild = sut.subscribe("*", (event) => seen.push(`wild:${event.type}`));

    sut.connect();
    await Promise.resolve();
    socket.onopen?.();
    socket.onmessage?.({ data: JSON.stringify({ channel: "post:1", type: "post.updated" }) });

    expect(seen).toEqual(["post:post.updated", "wild:post.updated"]);

    unsubChannel();
    unsubWild();
    socket.onmessage?.({ data: JSON.stringify({ channel: "post:1", type: "post.updated" }) });
    expect(seen).toHaveLength(2);
    sut.disconnect();
  });

  it("refuses to send while closed", () => {
    const sut = new RealtimeSocket({ getToken: async () => null });
    expect(sut.send("ping", "*", null)).toBe(false);
    sut.disconnect();
  });
});
