/**
 * Rich-text parser for post bodies (G1.5).
 *
 * Pure function: splits a body into text/mention/hashtag/link segments.
 * - `@handle`: letters/digits/`_.`, only when not glued to a word char
 *   (so `a@b.com` and `C#dev` stay plain text, never mis-taps).
 * - `#tag`: must start with a letter/underscore (so `Feed post #8` stays
 *   plain, while `#travel` links).
 * - Links: `http(s)://` runs; trailing `.,!?;:)` etc. stays outside the tap.
 */

export type RichSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; handle: string; text: string }
  | { kind: "hashtag"; tag: string; text: string }
  | { kind: "link"; url: string; text: string };

const TOKEN_PATTERN = /(@[A-Za-z0-9_.]+)|(#[A-Za-z_][A-Za-z0-9_]*)|(https?:\/\/[^\s<>"'`]+)/g;

const TRAILING_PUNCT = /[.,!?;:)\]}'"]+$/;

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_@#.]/.test(char);
}

/** Split `body` into render segments (never throws, never empty). */
export function parseRichText(body: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let cursor = 0;
  TOKEN_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(body)) !== null) {
    const token = match[0];
    const index = match.index;
    const prev = index > 0 ? body[index - 1] : undefined;

    const glued = isWordChar(prev);
    if (glued) continue;

    if (index > cursor) {
      segments.push({ kind: "text", text: body.slice(cursor, index) });
    }

    if (match[1]) {
      segments.push({ kind: "mention", handle: token.slice(1), text: token });
    } else if (match[2]) {
      segments.push({ kind: "hashtag", tag: token.slice(1), text: token });
    } else {
      const stripped = token.replace(TRAILING_PUNCT, "");
      const trail = token.slice(stripped.length);
      // A bare scheme with nothing after it is not a link.
      if (stripped.length <= "https://".length) {
        segments.push({ kind: "text", text: token });
      } else {
        segments.push({ kind: "link", url: stripped, text: stripped });
        if (trail) segments.push({ kind: "text", text: trail });
      }
    }
    cursor = index + token.length;
  }

  if (cursor < body.length) {
    segments.push({ kind: "text", text: body.slice(cursor) });
  }
  if (segments.length === 0) segments.push({ kind: "text", text: body });
  return segments;
}
