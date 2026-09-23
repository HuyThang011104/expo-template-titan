import { rewriteUniversalPath } from "@/shared/navigation";

/**
 * Native intent rewrite.
 *
 * Staging universal link `https://titan.example/p/{id}` → `/post/{id}`
 * (also `/post/{id}`, `/u/{handle}`, `/user/{handle}` — pure logic
 * lives in `src/shared/navigation/deep-links.ts` with tests).
 * Local scheme (`titan-dev://post/abc`) passes through unchanged.
 * On error return the original path, never crash.
 * Matches the SDK 57 `NativeIntent` signature in expo-router.
 */
export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string | null;
  initial: boolean;
}): string | null {
  try {
    return rewriteUniversalPath(path);
  } catch {
    return path;
  }
}
