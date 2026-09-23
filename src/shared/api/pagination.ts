/**
 * Standard pagination shape for list APIs. `nextCursor: null` means done.
 */

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
