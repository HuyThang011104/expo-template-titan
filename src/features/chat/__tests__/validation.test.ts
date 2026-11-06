/**
 * G3.1 chat image validation: heavy / wrong format reports inline.
 */

import { validateChatImage } from "../validation";
import type { PickedMedia } from "@/shared/media/picker";

const base: PickedMedia = {
  uri: "file:///tmp/a.jpg",
  width: 100,
  height: 100,
  kind: "image",
  mimeType: "image/jpeg",
  fileSize: 100_000,
};

describe("validateChatImage", () => {
  it("accepts a normal jpeg", () => {
    expect(validateChatImage(base)).toEqual({ ok: true });
  });

  it("rejects non-image kind", () => {
    const result = validateChatImage({ ...base, kind: "video", mimeType: "video/mp4" });
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported mime", () => {
    const result = validateChatImage({ ...base, mimeType: "image/gif" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("rejects overweight images", () => {
    const result = validateChatImage({ ...base, fileSize: 11 * 1024 * 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch("10MB");
  });
});
