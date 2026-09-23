/**
 * Vendor drivers. The hub (`client.ts`) speaks only this interface;
 * swapping PostHog/Mixpanel/custom means writing one adapter here.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsDriver = {
  readonly name: string;
  track: (event: string, props: AnalyticsProps) => void;
  identify?: (userId: string) => void;
  reset?: () => void;
  flush?: () => void;
};

/** Dev driver: mirrors events to the console. Never ships to prod. */
export const consoleDriver: AnalyticsDriver = {
  name: "console",
  track: (event, props) => {
    console.debug(`[analytics] ${event}`, props);
  },
  identify: (userId) => {
    console.debug(`[analytics] identify ${userId}`);
  },
  reset: () => {
    console.debug("[analytics] reset");
  },
};

/** Prod default until a vendor lands: drops everything, never throws. */
export const noopDriver: AnalyticsDriver = {
  name: "noop",
  track: () => {},
};
