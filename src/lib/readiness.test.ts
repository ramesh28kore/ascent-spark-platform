import { describe, expect, it } from "vitest";

import { READINESS_WEIGHTS, bandVariant, practiceScore, readinessIndex } from "./readiness";

const input = (over: Partial<Parameters<typeof readinessIndex>[0]> = {}) => ({
  attendancePct: 0,
  testAvg: 0,
  codingScore: 0,
  mockRating: 0,
  coreAvg: 0,
  ...over,
});

describe("readinessIndex", () => {
  it("uses the documented 15/30/30/15/10 weighting", () => {
    expect(READINESS_WEIGHTS.map((w) => w.weight)).toEqual([0.15, 0.3, 0.3, 0.15, 0.1]);
    expect(READINESS_WEIGHTS.reduce((s, w) => s + w.weight, 0)).toBeCloseTo(1);
  });

  it("scores a perfect student at 100 and an empty one at 0", () => {
    expect(
      readinessIndex(
        input({
          attendancePct: 100,
          testAvg: 100,
          codingScore: 100,
          mockRating: 100,
          coreAvg: 100,
        }),
      ),
    ).toEqual({ score: 100, band: "Ready" });
    expect(readinessIndex(input())).toEqual({ score: 0, band: "Needs Work" });
  });

  it("weights each component independently", () => {
    expect(readinessIndex(input({ testAvg: 100 })).score).toBe(30);
    expect(readinessIndex(input({ codingScore: 100 })).score).toBe(30);
    expect(readinessIndex(input({ attendancePct: 100 })).score).toBe(15);
    expect(readinessIndex(input({ mockRating: 100 })).score).toBe(15);
    expect(readinessIndex(input({ coreAvg: 100 })).score).toBe(10);
  });

  it("clamps out-of-range and non-finite inputs", () => {
    expect(readinessIndex(input({ testAvg: 400, codingScore: -50 })).score).toBe(30);
    expect(readinessIndex(input({ coreAvg: Number.NaN })).score).toBe(0);
    expect(readinessIndex(input({ coreAvg: Number.POSITIVE_INFINITY })).score).toBe(0);
  });

  it("bands at the 75 and 55 boundaries", () => {
    expect(readinessIndex(input({ testAvg: 100, codingScore: 100, mockRating: 100 })).band).toBe(
      "Ready",
    );
    const near = readinessIndex(input({ testAvg: 100, codingScore: 100 }));
    expect(near).toEqual({ score: 60, band: "Near-Ready" });
    expect(readinessIndex(input({ testAvg: 100, coreAvg: 100 })).band).toBe("Needs Work");
  });

  it("rounds to two decimals", () => {
    expect(readinessIndex(input({ attendancePct: 33.333 })).score).toBe(5);
    expect(readinessIndex(input({ testAvg: 66.666 })).score).toBe(20);
  });
});

describe("bandVariant", () => {
  it("maps bands to badge variants", () => {
    expect(bandVariant("Ready")).toBe("default");
    expect(bandVariant("Near-Ready")).toBe("secondary");
    expect(bandVariant("Needs Work")).toBe("destructive");
  });
});

describe("practiceScore", () => {
  it("normalises solved points against the ladder", () => {
    expect(practiceScore(0, 0)).toBe(0);
    expect(practiceScore(50, 200)).toBe(25);
    expect(practiceScore(200, 200)).toBe(100);
  });

  it("clamps above the total", () => {
    expect(practiceScore(400, 200)).toBe(100);
  });
});
