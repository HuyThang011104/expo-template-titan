/**
 * Post share links (G1.4).
 *
 * Pure builders: `myapp://post/<id>` opens the detail screen when logged in
 * (custom scheme passes through `+native-intent` untouched; the
 * `Stack.Protected` guard sends logged-out users to sign-in). The scheme
 * comes from `expo-linking` at runtime so preview/production variants get
 * their own link — tests inject it explicitly.
 */

/** Build `<scheme>://post/<id>` for the system share sheet + clipboard. */
export function buildPostDeepLink(postId: string, scheme: string): string {
  const cleanScheme = scheme.replace(/:\/*$/, "").trim();
  const cleanId = postId.trim();
  return `${cleanScheme}://post/${encodeURIComponent(cleanId)}`;
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
