/**
 * Account deactivation flag (G2.4).
 *
 * "Vô hiệu hóa (ẩn tạm, login lại mở)": deactivating signs out and marks the
 * viewer locally hidden; the next successful `signIn` clears the mark
 * (see `shared/auth/session-provider`). Viewer-scoped singleton — the mock
 * backend has a single viewer, so per-user keys would never diverge.
 */

import { deleteKvItem, getKvItem, setKvItem } from "../storage/kv";

const DEACTIVATION_KEY = "account-deactivated";

/** Whether the viewer deactivated (never throws — corrupt state reads false). */
export function isDeactivated(): boolean {
  try {
    return getKvItem(DEACTIVATION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Mark the viewer deactivated (best-effort, never throws). */
export function setDeactivated(): void {
  try {
    setKvItem(DEACTIVATION_KEY, "1");
  } catch {
    // Best effort: deactivation must never break sign-out.
  }
}

/** Clear the mark (login re-opens the account). */
export function clearDeactivated(): void {
  try {
    deleteKvItem(DEACTIVATION_KEY);
  } catch {
    // Best effort.
  }
}
