/**
 * Tests for G2.1 profile validation (format/size inline, old image kept).
 */

import { validateProfileForm, validateProfileImage } from "../validation";

describe("validateProfileImage", () => {
  it("rejects unsupported formats", () => {
    expect(
      validateProfileImage({ uri: "file:///a.gif", mimeType: "image/gif" }),
    ).toMatch(/Unsupported image format/);
  });

  it("rejects oversized images", () => {
    expect(
      validateProfileImage({
        uri: "file:///a.jpg",
        mimeType: "image/jpeg",
        fileSize: 6 * 1024 * 1024,
      }),
    ).toMatch(/too large/);
  });

  it("accepts jpg/png/webp under 5MB", () => {
    expect(
      validateProfileImage({ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: 100 }),
    ).toBeNull();
    expect(validateProfileImage({ uri: "file:///a.png" })).toBeNull();
  });
});

describe("validateProfileForm", () => {
  it("requires a display name", () => {
    const errors = validateProfileForm({
      displayName: "   ",
      bio: "",
      avatarUrl: null,
      coverUrl: null,
      link: "",
    });
    expect(errors.displayName).toBeTruthy();
  });

  it("rejects bad links inline", () => {
    const errors = validateProfileForm({
      displayName: "Ava",
      bio: "",
      avatarUrl: null,
      coverUrl: null,
      link: "not-a-url",
    });
    expect(errors.link).toBeTruthy();
  });

  it("accepts a full valid form", () => {
    const errors = validateProfileForm({
      displayName: "Ava",
      bio: "Hi",
      avatarUrl: "https://picsum.photos/seed/u1/200",
      coverUrl: null,
      link: "https://titan.example/ava",
    });
    expect(errors).toEqual({});
  });
});
