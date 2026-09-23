import { logger } from "../observability/logger";

/**
 * Date helpers. Relative buckets under 30 days, else `dd/MM/yyyy`.
 * Invalid ISO warns and returns `""`.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    logger.warn("[date] invalid ISO string", { iso });
    return "";
  }
  const diffMs = now.getTime() - time;
  if (diffMs < 0) return "Just now";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 30 * day) return `${Math.floor(diffMs / day)}d ago`;
  const d = new Date(time);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
