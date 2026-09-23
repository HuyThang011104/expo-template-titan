import { UNIVERSAL_LINK_HOST } from "./hrefs";

/**
 * Rewrites universal/native paths to internal routes.
 * Pure and unit-tested; unknown hosts/paths and all throws return the input.
 */

const POST_ALIASES = new Set(["p", "post"]);
const USER_ALIASES = new Set(["u", "user"]);

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitQuery(path: string): [path: string, query: string] {
  const index = path.indexOf("?");
  if (index === -1) return [path, ""];
  return [path.slice(0, index), path.slice(index + 1)];
}

/** Maps an internal 2-segment pathname to an app route, else `null`. */
function rewritePathname(pathname: string): string | null {
  const [rawPath, query] = splitQuery(pathname);
  const segments = rawPath
    .split("/")
    .filter((part) => part.length > 0)
    .map(safeDecode);
  if (segments.length !== 2) return null;
  const [head, tail] = segments as [string, string];
  if (!head || !tail) return null;
  const suffix = query ? `?${query}` : "";
  if (POST_ALIASES.has(head)) return `/post/${encodeURIComponent(tail)}${suffix}`;
  if (USER_ALIASES.has(head)) return `/user/${encodeURIComponent(tail)}${suffix}`;
  return null;
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value);
}

export function rewriteUniversalPath(path: string | null): string | null {
  if (path === null) return null;
  try {
    const trimmed = path.trim();
    if (trimmed === "") return path;

    if (isAbsoluteUrl(trimmed)) {
      let url: URL;
      try {
        url = new URL(trimmed);
      } catch {
        return path;
      }
      const host = url.hostname.toLowerCase();
      if (host !== UNIVERSAL_LINK_HOST && !host.endsWith(`.${UNIVERSAL_LINK_HOST}`)) {
        return path;
      }
      return rewritePathname(`${url.pathname}${url.search}`) ?? path;
    }

    const rewritten = rewritePathname(trimmed);
    if (rewritten) return rewritten;
    // Already-valid internal path — keep as is; the router resolves the rest.
    return path;
  } catch {
    return path;
  }
}

/** String path for a post href, for logging/display only (never push). */
export function postPath(id: string): string {
  return `/post/${encodeURIComponent(id)}`;
}
