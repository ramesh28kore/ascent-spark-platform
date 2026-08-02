import { describe, expect, it } from "vitest";

import {
  applyFilters,
  bandFor,
  buildMarksReport,
  buildMatrixReport,
  indexSubmissions,
  summarise,
  type GradebookData,
} from "@/lib/gradebook";
import { publishBlockers, slugify } from "@/lib/authoring-shared";

const data: GradebookData = {
  students: [
    { id: "s1", full_name: "Asha", roll_number: "R1", batch_id: "b1", batch_name: "A" },
    { id: "s2", full_name: "Bala", roll_number: "R2", batch_id: "b2", batch_name: "B" },
  ],
  problems: [
    { id: "p1", title: "Two sum", level: "easy", points: 10, module_id: "m1", module_code: "M1" },
    { id: "p2", title: "LRU", level: "hard", points: 30, module_id: "m2", module_code: "M2" },
  ],
  submissions: [
    {
      student_id: "s1",
      problem_id: "p1",
      verdict: "wrong answer",
      runtime_ms: 40,
      cases_passed: 1,
      cases_total: 3,
      created_at: "2026-01-02T10:00:00Z",
    },
    {
      student_id: "s1",
      problem_id: "p1",
      verdict: "accepted",
      runtime_ms: 12,
      cases_passed: 3,
      cases_total: 3,
      created_at: "2026-01-03T10:00:00Z",
    },
    {
      student_id: "s2",
      problem_id: "p2",
      verdict: "runtime error",
      runtime_ms: 0,
      cases_passed: 0,
      cases_total: 5,
      created_at: "2026-02-01T10:00:00Z",
    },
  ],
};

const allFilters = { batchId: "all", moduleId: "all", from: "", to: "" };

describe("gradebook summarise", () => {
  it("marks a problem solved once any submission is accepted", () => {
    const index = indexSubmissions(data.submissions);
    const cell = summarise(index.get("s1::p1") ?? [], data.problems[0]);
    expect(cell.status).toBe("solved");
    expect(cell.attempts).toBe(2);
    expect(cell.points).toBe(10);
    expect(cell.bestRuntimeMs).toBe(12);
  });

  it("keeps failed attempts as attempted with zero points", () => {
    const index = indexSubmissions(data.submissions);
    const cell = summarise(index.get("s2::p2") ?? [], data.problems[1]);
    expect(cell.status).toBe("attempted");
    expect(cell.points).toBe(0);
  });

  it("reports not started with no submissions", () => {
    expect(summarise([], data.problems[0]).status).toBe("not started");
  });
});

describe("gradebook filters", () => {
  it("narrows students by batch and drops their submissions", () => {
    const out = applyFilters(data, { ...allFilters, batchId: "b1" });
    expect(out.students.map((s) => s.id)).toEqual(["s1"]);
    expect(out.submissions.every((s) => s.student_id === "s1")).toBe(true);
  });

  it("applies the date window", () => {
    const out = applyFilters(data, { ...allFilters, from: "2026-01-03", to: "2026-01-31" });
    expect(out.submissions).toHaveLength(1);
    expect(out.submissions[0].verdict).toBe("accepted");
  });
});

describe("gradebook reports", () => {
  it("builds a matrix with one column per problem", () => {
    const doc = buildMatrixReport(data, allFilters);
    expect(doc.sections[0].columns).toContain("Two sum");
    expect(doc.sections[0].rows).toHaveLength(2);
  });

  it("computes marks out of the total available points", () => {
    const doc = buildMarksReport(data, allFilters);
    const asha = doc.sections[0].rows.find((r) => r[1] === "Asha")!;
    expect(asha[8]).toBe(10); // marks
    expect(asha[9]).toBe(40); // out of
    expect(asha[10]).toBe("25%");
  });

  it("bands percentages", () => {
    expect(bandFor(90)).toBe("Excellent");
    expect(bandFor(10)).toBe("At risk");
  });
});

describe("authoring guards", () => {
  it("slugifies titles", () => {
    expect(slugify("Two Sum II — Input Array")).toBe("two-sum-ii-input-array");
  });

  it("blocks publishing until the problem is complete", () => {
    expect(
      publishBlockers({
        test_cases: [],
        statement: "",
        solution: null,
        visible_to_all_batches: false,
        batch_ids: [],
      }),
    ).toHaveLength(4);

    expect(
      publishBlockers({
        test_cases: [{}],
        statement: "Find the pair that sums to target.",
        solution: "print(1)",
        visible_to_all_batches: true,
        batch_ids: [],
      }),
    ).toHaveLength(0);
  });
});
