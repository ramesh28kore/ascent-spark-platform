/**
 * Composite placement-readiness index.
 * Pure, client-safe, no imports — used by UI, reports and server functions alike.
 *
 * Attendance 15% | Weekly tests 30% | Coding practice 30% | Mock interview 15% | Core tests 10%
 */
export type ReadinessBand = "Ready" | "Near-Ready" | "Needs Work";

export type ReadinessInput = {
  attendancePct: number;
  testAvg: number;
  codingScore: number;
  mockRating: number;
  coreAvg: number;
};

export const READINESS_WEIGHTS: { key: keyof ReadinessInput; label: string; weight: number }[] = [
  { key: "attendancePct", label: "Attendance", weight: 0.15 },
  { key: "testAvg", label: "Weekly tests", weight: 0.3 },
  { key: "codingScore", label: "Coding practice", weight: 0.3 },
  { key: "mockRating", label: "Mock interview", weight: 0.15 },
  { key: "coreAvg", label: "Core subjects", weight: 0.1 },
];

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function readinessIndex(input: ReadinessInput): { score: number; band: ReadinessBand } {
  const score =
    0.15 * clamp(input.attendancePct) +
    0.3 * clamp(input.testAvg) +
    0.3 * clamp(input.codingScore) +
    0.15 * clamp(input.mockRating) +
    0.1 * clamp(input.coreAvg);
  const rounded = Math.round(score * 100) / 100;
  const band: ReadinessBand = rounded >= 75 ? "Ready" : rounded >= 55 ? "Near-Ready" : "Needs Work";
  return { score: rounded, band };
}

export function bandVariant(band: ReadinessBand): "default" | "secondary" | "destructive" {
  if (band === "Ready") return "default";
  if (band === "Near-Ready") return "secondary";
  return "destructive";
}

/** Difficulty-weighted practice score, normalised to 0-100 against the full ladder. */
export function practiceScore(solvedPoints: number, totalPoints: number): number {
  if (!totalPoints) return 0;
  return clamp((solvedPoints / totalPoints) * 100);
}
