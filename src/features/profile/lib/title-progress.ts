/**
 * Pure helpers for the Q7 header title crossfade (PF4.2).
 *
 * They run inside Reanimated worklets (`"worklet"` directives) and in Jest,
 * so the screen, the title component, and the tests share one definition of
 * the threshold math.
 *
 * Spec: docs/feel-spec.md §4.4.1.
 */

export type TitleSwitchRange = {
  /** Scroll offset where `@handle` starts fading out. */
  start: number;
  /** Scroll offset where the display name is fully visible. */
  end: number;
};

/**
 * Linear progress in `[0, 1]` between `start` and `end`.
 * Overscroll (`scrollY < 0`) and inverted/degenerate ranges clamp safely.
 */
export function titleProgress(scrollY: number, range: TitleSwitchRange): number {
  "worklet";
  const { start, end } = range;
  // Unmeasured or invalid range: stay on the handle (never switch early).
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (scrollY <= start) return 0;
  if (scrollY >= end) return 1;
  return (scrollY - start) / (end - start);
}

/** Reduce motion: snap at the threshold instead of crossfading. */
export function titleProgressSnapped(scrollY: number, range: TitleSwitchRange): number {
  "worklet";
  const { start, end } = range;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return scrollY >= end ? 1 : 0;
}

/** Which label wins once the crossfade has passed its midpoint. */
export function isTitleSwitched(progress: number): boolean {
  "worklet";
  return progress >= 0.5;
}

/** Accessible header label; updated only when the threshold flips. */
export function titleAccessibilityLabel(
  switched: boolean,
  handle: string,
  displayName: string,
): string {
  return switched ? displayName : `@${handle}`;
}
