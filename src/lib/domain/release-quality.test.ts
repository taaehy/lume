import { describe, expect, it } from "vitest";

import { calculateReleaseQuality } from "./release-quality";

describe("release quality", () => {
  it("marks a clean release as ready", () => {
    const result = calculateReleaseQuality({
      testsTotal: 100,
      testsPassed: 100,
      testsFailed: 0,
      testsBlocked: 0,
      openCriticalBugs: 0,
      openHighBugs: 0,
      reopenedBugs: 0,
      unresolvedRegressions: 0,
    });

    expect(result).toMatchObject({
      score: 100,
      status: "READY",
      passRate: 100,
    });
  });

  it("caps and blocks a release with hard blockers", () => {
    const result = calculateReleaseQuality({
      testsTotal: 145,
      testsPassed: 137,
      testsFailed: 5,
      testsBlocked: 3,
      openCriticalBugs: 3,
      openHighBugs: 2,
      reopenedBugs: 1,
      unresolvedRegressions: 0,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.score).toBeLessThanOrEqual(59);
    expect(result.blockers).toContain("3 bugs críticos abertos");
  });
});
