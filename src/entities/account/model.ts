/**
 * Account model — plain types (G2.4).
 *
 * No imports, so the model stays standalone.
 * Sessions list the viewer's logins; export carries the minimal
 * store-review JSON (my profile + my posts, duplicated locally because
 * entity-to-entity imports are banned).
 */

export type SessionId = string;

export type AccountSession = {
  id: SessionId;
  deviceName: string;
  ipAddress: string;
  /** True for the session on this device. */
  current: boolean;
  /** ISO datetime string. */
  lastActiveAt: string;
};

export type ExportProfile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  link: string | null;
};

export type ExportPost = {
  id: string;
  body: string;
  likeCount: number;
  createdAt: string;
};

export type ExportData = {
  profile: ExportProfile;
  posts: ExportPost[];
  /** ISO datetime string of the export. */
  exportedAt: string;
};
