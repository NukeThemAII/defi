import { describe, expect, it } from "vitest";

import {
  buildEarningsProjections,
  calculateBlendedApy,
  calculateDailyEarnings,
  calculateEarningsProjection,
} from "./metrics";

describe("calculateBlendedApy", () => {
  it("returns zero when no balances", () => {
    expect(calculateBlendedApy([])).toBe(0);
  });

  it("weights APY by balance proportion", () => {
    const apy = calculateBlendedApy([
      { balanceUsd: 1_000, apyPercent: 10 },
      { balanceUsd: 4_000, apyPercent: 5 },
    ]);

    expect(apy).toBeCloseTo(6, 5);
  });
});

describe("calculateDailyEarnings", () => {
  it("computes proportional earnings", () => {
    const earnings = calculateDailyEarnings(10_000, 12);
    expect(earnings).toBeCloseTo((10_000 * 0.12) / 365, 8);
  });

  it("returns zero for non-positive balances", () => {
    expect(calculateDailyEarnings(0, 12)).toBe(0);
  });
});

describe("calculateEarningsProjection", () => {
  it("scales linearly without compounding", () => {
    const projection = calculateEarningsProjection(10_000, 12, 30);
    expect(projection).toBeCloseTo((10_000 * 0.12 * 30) / 365, 2);
  });

  it("supports weekly compounding", () => {
    const linear = calculateEarningsProjection(10_000, 12, 365, false);
    const compounded = calculateEarningsProjection(10_000, 12, 365, true);
    expect(compounded).toBeGreaterThan(linear);
  });
});

describe("buildEarningsProjections", () => {
  it("returns projections for standard periods", () => {
    const projections = buildEarningsProjections(5_000, 8, false);
    expect(Object.keys(projections)).toEqual(["1d", "7d", "30d", "90d", "365d"]);
    expect(projections["1d"]).toBeCloseTo((5_000 * 0.08) / 365, 6);
  });
});
