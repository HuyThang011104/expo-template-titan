/**
 * Share links (G1.4, G2.1).
 *
 * Pure builders: `<scheme>://post/<id>` opens the detail screen when logged
 * in (custom scheme passes through `+native-intent` untouched; the
 * `Stack.Protected` guard sends logged-out users to sign-in). The scheme
 * comes from `expo-linking` at runtime so preview/production variants get
 * their own link — tests inject it explicitly.
 */

import * as Linking from "expo-linking";

/** Build `<scheme>://post/<id>` for the system share sheet + clipboard. */
export function buildPostDeepLink(postId: string, scheme: string): string {
  const cleanScheme = scheme.replace(/:\/*$/, "").trim();
  const cleanId = postId.trim();
  return `${cleanScheme}://post/${encodeURIComponent(cleanId)}`;
}

/** Build `<scheme>://user/<handle>` for sharing a profile. */
export function buildUserDeepLink(handle: string, scheme: string): string {
  const cleanScheme = scheme.replace(/:\/*$/, "").trim();
  const cleanHandle = handle.trim();
  return `${cleanScheme}://user/${encodeURIComponent(cleanHandle)}`;
}

/** Parse a shared link back to its post id (`null` when not a post link). */
export function parsePostDeepLink(url: string): string | null {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/post\/([^/?#]+)/.exec(url.trim());
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * App scheme from the running build (`titan-dev` fallback in Jest/dev).
 * Callers share it so every surface builds links the same way.
 */
export function resolveAppScheme(): string {
  try {
    const base = Linking.createURL("");
    const scheme = base.split("://")[0];
    if (scheme) return scheme;
  } catch {
    // Fall through to the dev default below.
  }
  return "titan-dev";
}
