/**
 * Tests for `shared/analytics` hub. Driver is injectable; hub never throws.
 */

import {
  ANALYTICS_EVENTS,
  identify,
  resetAnalytics,
  resetAnalyticsHubForTests,
  setAnalyticsDriver,
  setAnalyticsEnabled,
  trackEvent,
  type AnalyticsDriver,
} from "../index";

function makeDriver(): AnalyticsDriver & { events: { event: string; props: object }[] } {
  const events: { event: string; props: object }[] = [];
  return {
    name: "test",
    events,
    track: (event, props) => {
      events.push({ event, props });
    },
  };
}

beforeEach(() => {
  resetAnalyticsHubForTests();
});

describe("analytics hub", () => {
  it("forwards events to the active driver", () => {
    const driver = makeDriver();
    setAnalyticsDriver(driver);
    trackEvent(ANALYTICS_EVENTS.feedOpened, { source: "tab" });
    expect(driver.events).toEqual([{ event: "feed_opened", props: { source: "tab" } }]);
  });

  it("attaches identity after identify(), drops it after reset()", () => {
    const driver = makeDriver();
    setAnalyticsDriver(driver);
    trackEvent("x");
    identify("u1");
    trackEvent("y");
    resetAnalytics();
    trackEvent("z");
    expect(driver.events).toEqual([
      { event: "x", props: {} },
      { event: "y", props: { userId: "u1" } },
      { event: "z", props: {} },
    ]);
  });

  it("drops everything while disabled", () => {
    const driver = makeDriver();
    setAnalyticsDriver(driver);
    setAnalyticsEnabled(false);
    trackEvent("x");
    expect(driver.events).toHaveLength(0);
  });

  it("never throws when the driver throws", () => {
    setAnalyticsDriver({
      name: "broken",
      track: () => {
        throw new Error("sink down");
      },
    });
    expect(() => trackEvent("x")).not.toThrow();
    expect(() => identify("u1")).not.toThrow();
    expect(() => resetAnalytics()).not.toThrow();
  });
});
