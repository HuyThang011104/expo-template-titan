/**
 * Minimal User fixtures.
 *
 * - Two users: `u-1` with avatar, `u-2` with null avatar.
 * - For tests/dev via explicit `fetchImpl` only.
 */

import type { User } from "./model";

export const mockUser1: User = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: "https://picsum.photos/seed/u1/200",
  bio: "Coffee + trail runs.",
  coverUrl: "https://picsum.photos/seed/u1cover/800/300",
  link: "https://titan.example/ava",
  privacySettings: {
    messageAudience: "everyone",
    postVisibility: "public",
    tagAudience: "everyone",
  },
};

export const mockUser2: User = {
  id: "u-2",
  handle: "liam",
  displayName: "Liam Carter",
  avatarUrl: null,
  bio: null,
  coverUrl: null,
  link: null,
  privacySettings: {
    messageAudience: "everyone",
    postVisibility: "public",
    tagAudience: "everyone",
  },
};

export const mockUsers: User[] = [mockUser1, mockUser2];
