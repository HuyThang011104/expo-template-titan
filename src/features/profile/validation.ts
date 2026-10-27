/**
 * Edit-profile validation (G2.1).
 *
 * Wraps `parseUpdateProfileInput` from `entities/user` so the screen only
 * deals with display strings. Zod failure → `null` + `logger.warn` inside
 * the entity; here we map to inline messages (no throw).
 * Image file checks (format/size) keep the old image on failure.
 */

import { parseUpdateProfileInput } from "@/entities/user";

export const PROFILE_DISPLAY_NAME_MAX = 50;
export const PROFILE_BIO_MAX = 160;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

export type ProfileImageCandidate = {
  uri?: string;
  mimeType?: string;
  fileSize?: number;
};

/**
 * Validate a picked avatar/cover asset.
 * Returns an inline message when format/size is bad, else `null`.
 * Missing metadata falls back to the uri extension; unknown → reject.
 */
export function validateProfileImage(asset: ProfileImageCandidate): string | null {
  const mime = (asset.mimeType ?? "").toLowerCase().trim();
  if (mime.length > 0) {
    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      return "Unsupported image format. Use JPG, PNG or WebP.";
    }
  } else {
    const uri = asset.uri ?? "";
    const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      return "Unsupported image format. Use JPG, PNG or WebP.";
    }
  }
  if (typeof asset.fileSize === "number" && asset.fileSize > PROFILE_IMAGE_MAX_BYTES) {
    return "Image is too large (max 5MB). Pick a lighter one.";
  }
  return null;
}

export type ProfileFormValues = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  link: string;
};

export type ProfileFormErrors = Partial<
  Record<"displayName" | "bio" | "avatarUrl" | "coverUrl" | "link", string>
>;

/** Field-level validation for the edit form (inline errors, no throw). */
export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const name = values.displayName.trim();
  if (name.length === 0) {
    errors.displayName = "Name can't be empty.";
  } else if (name.length > PROFILE_DISPLAY_NAME_MAX) {
    errors.displayName = `Name is limited to ${PROFILE_DISPLAY_NAME_MAX} characters.`;
  }
  if (values.bio.trim().length > PROFILE_BIO_MAX) {
    errors.bio = `Bio is limited to ${PROFILE_BIO_MAX} characters.`;
  }
  if (!parseUpdateProfileInput(values)) {
    // Map the generic failure to the most likely field for inline display.
    if (!errors.displayName && !errors.bio) {
      const link = values.link.trim();
      if (link.length > 0) {
        try {
          const url = new URL(link);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            errors.link = "Link must start with http(s).";
          } else {
            errors.displayName = "Some details are invalid. Check name, bio and link.";
          }
        } catch {
          errors.link = "Link is not a valid URL.";
        }
      } else {
        if (values.avatarUrl !== null) errors.avatarUrl = "Avatar URL is invalid.";
        else if (values.coverUrl !== null) errors.coverUrl = "Cover URL is invalid.";
        else errors.displayName = "Some details are invalid. Check name, bio and link.";
      }
    }
  }
  return errors;
}
