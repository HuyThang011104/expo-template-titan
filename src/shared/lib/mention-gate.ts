/**
 * Mention/tag gate helper (G2.3).
 *
 * Pure function with injected callbacks, so features (`composer`,
 * `post-detail`) share it without cross-feature imports and without
 * entity imports here (`shared` never imports entities).
 * Unknown handles fail open — the handle page itself 404s gracefully.
 */

/** Handles blocked by the mentioned users' `tagAudience` (deduped). */
export function findBlockedMentionHandles(
  handles: string[],
  resolveUserId: (handle: string) => string | undefined,
  canTag: (targetId: string) => boolean,
): string[] {
  const seen = new Set<string>();
  const blocked: string[] = [];
  for (const handle of handles) {
    const lower = handle.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const targetId = resolveUserId(handle);
    if (!targetId) continue;
    if (!canTag(targetId)) blocked.push(handle);
  }
  return blocked;
}
