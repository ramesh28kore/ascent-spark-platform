import { describe, expect, it } from "vitest";

import {
  CO_DEFINITIONS,
  PO_LIST,
  attainmentLevel,
  batchToCsv,
  buildStudentReport,
  reportToCsv,
  type AssessmentRow,
  type ModuleRow,
  type ScoreRow,
  type StudentRow,
} from "./crt-report";

const student: StudentRow = {
  id: "s1",
  full_name: "Asha, R",
  roll_number: "22CS001",
  branch: "CSE",
  batch: "B1",
  year: "3",
  email: "asha@example.edu",
};

const modules: ModuleRow[] = [
  { id: "m1", code: "M1", title: "Programming", weight_percent: 20 },
  { id: "m2", code: "M2", title: "Data structures", weight_percent: 30 },
];

const assessments: AssessmentRow[] = [
  {
    id: "a1",
    title: "Weekly 1",
    kind: "weekly",
    module_id: "m1",
    max_marks: 50,
    scheduled_on: "2026-01-10",
  },
  {
    id: "a2",
    title: "Weekly 2",
    kind: "weekly",
    module_id: "m2",
    max_marks: 100,
    scheduled_on: "2026-01-03",
  },
];

const scores: ScoreRow[] = [
  { id: "x1", student_id: "s1", assessment_id: "a1", marks: 40, attempts: 2, recorded_at: "" },
  { id: "x2", student_id: "s1", assessment_id: "a2", marks: "50", attempts: 1, recorded_at: "" },
  { id: "x3", student_id: "s2", assessment_id: "a1", marks: 10, attempts: 1, recorded_at: "" },
];

describe("attainmentLevel", () => {
  it("uses the 70/60/50 thresholds", () => {
    expect(attainmentLevel(70)).toBe(3);
    expect(attainmentLevel(69.9)).toBe(2);
    expect(attainmentLevel(60)).toBe(2);
    expect(attainmentLevel(50)).toBe(1);
    expect(attainmentLevel(49)).toBe(0);
    expect(attainmentLevel(0)).toBe(0);
  });
});

describe("buildStudentReport", () => {
  const report = buildStudentReport(student, modules, assessments, scores);

  it("only includes this student's scores, oldest first", () => {
    expect(report.details.map((d) => d.assessment)).toEqual(["Weekly 2", "Weekly 1"]);
    expect(report.totalAttempts).toBe(3);
  });

  it("computes per-assessment and overall percentages", () => {
    expect(report.details.map((d) => d.percent)).toEqual([50, 80]);
    expect(report.overallPercent).toBe(65);
  });

  it("maps modules onto course outcomes with attainment levels", () => {
    const m1 = report.coRows.find((c) => c.module === "M1")!;
    expect(m1.co).toBe(CO_DEFINITIONS.M1.co);
    expect(m1.tests).toBe(1);
    expect(m1.percent).toBe(80);
    expect(m1.level).toBe(3);

    const m2 = report.coRows.find((c) => c.module === "M2")!;
    expect(m2.percent).toBe(50);
    expect(m2.level).toBe(1);
  });

  it("derives PO attainment as a correlation-weighted CO average", () => {
    // PO1: M1 (80 @ corr 3) and M2 (50 @ corr 3) -> 65
    expect(report.poRows.find((p) => p.po === "PO1")?.percent).toBe(65);
    // PO3: M1 corr 1 (80), M2 corr 2 (50) -> (80 + 100) / 3 = 60
    expect(report.poRows.find((p) => p.po === "PO3")?.percent).toBe(60);
    // POs with no contributing CO are dropped entirely.
    expect(report.poRows.find((p) => p.po === "PO9")).toBeUndefined();
    expect(report.poRows.every((p) => PO_LIST.includes(p.po))).toBe(true);
  });

  it("handles a student with no scores", () => {
    const empty = buildStudentReport({ ...student, id: "nobody" }, modules, assessments, scores);
    expect(empty.details).toEqual([]);
    expect(empty.overallPercent).toBe(0);
    expect(empty.poRows).toEqual([]);
    expect(empty.coRows.every((c) => c.tests === 0 && c.level === 0)).toBe(true);
  });
});

describe("csv output", () => {
  const report = buildStudentReport(student, modules, assessments, scores);

  it("quotes cells containing commas", () => {
    const csv = reportToCsv(report);
    expect(csv).toContain('"Asha, R"');
    expect(csv.split("\n")[0]).toBe("CRT Student Report");
  });

  it("writes one batch row per student with CO and PO columns", () => {
    const csv = batchToCsv([report, report]);
    const [header, ...rows] = csv.split("\n");
    expect(rows).toHaveLength(2);
    expect(header.split(",")).toContain("PSO1 %");
    expect(header).toContain("CO1 %");
  });
});
