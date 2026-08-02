/**
 * Trainer gradebook builders.
 *
 * Turns raw practice-problem submission data into `ReportDoc`s that the shared
 * PDF / Excel / CSV writers can render, so grading downloads look like every
 * other CRT export.
 */
import type { ReportCell, ReportDoc } from "@/lib/report-builders";

export type GradebookStudent = {
  id: string;
  full_name: string;
  roll_number: string | null;
  batch_id: string | null;
  batch_name: string | null;
};

export type GradebookProblem = {
  id: string;
  title: string;
  level: string;
  points: number;
  module_id: string | null;
  module_code: string | null;
};

export type GradebookSubmission = {
  student_id: string;
  problem_id: string;
  verdict: string;
  runtime_ms: number;
  cases_passed: number;
  cases_total: number;
  created_at: string;
};

export type GradebookData = {
  students: GradebookStudent[];
  problems: GradebookProblem[];
  submissions: GradebookSubmission[];
};

export type GradebookFilters = {
  batchId: string; // "all" or a batches.id
  moduleId: string; // "all" or a modules.id
  from: string; // "" or YYYY-MM-DD
  to: string; // "" or YYYY-MM-DD
};

export type CellSummary = {
  status: "solved" | "attempted" | "not started";
  attempts: number;
  bestVerdict: string;
  bestRuntimeMs: number | null;
  lastAt: string | null;
  points: number;
};

const BANDS: { min: number; label: string }[] = [
  { min: 85, label: "Excellent" },
  { min: 70, label: "Good" },
  { min: 50, label: "Developing" },
  { min: 0, label: "At risk" },
];

export function bandFor(percent: number) {
  return (BANDS.find((b) => percent >= b.min) ?? BANDS[BANDS.length - 1]).label;
}

function inWindow(iso: string, filters: GradebookFilters) {
  const day = iso.slice(0, 10);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;
  return true;
}

export function applyFilters(data: GradebookData, filters: GradebookFilters): GradebookData {
  const students = data.students.filter(
    (s) => filters.batchId === "all" || s.batch_id === filters.batchId,
  );
  const problems = data.problems.filter(
    (p) => filters.moduleId === "all" || p.module_id === filters.moduleId,
  );
  const studentIds = new Set(students.map((s) => s.id));
  const problemIds = new Set(problems.map((p) => p.id));
  const submissions = data.submissions.filter(
    (s) => studentIds.has(s.student_id) && problemIds.has(s.problem_id) && inWindow(s.created_at, filters),
  );
  return { students, problems, submissions };
}

/** One cell of the student × problem grid. */
export function summarise(
  subs: GradebookSubmission[],
  problem: GradebookProblem,
): CellSummary {
  if (subs.length === 0)
    return {
      status: "not started",
      attempts: 0,
      bestVerdict: "—",
      bestRuntimeMs: null,
      lastAt: null,
      points: 0,
    };

  const accepted = subs.filter((s) => s.verdict === "accepted");
  const sorted = [...subs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const runtimes = (accepted.length ? accepted : subs).map((s) => s.runtime_ms).filter((n) => n > 0);

  return {
    status: accepted.length ? "solved" : "attempted",
    attempts: subs.length,
    bestVerdict: accepted.length
      ? "accepted"
      : [...subs].sort((a, b) => b.cases_passed - a.cases_passed)[0].verdict,
    bestRuntimeMs: runtimes.length ? Math.min(...runtimes) : null,
    lastAt: sorted[0].created_at,
    points: accepted.length ? problem.points : 0,
  };
}

export function indexSubmissions(submissions: GradebookSubmission[]) {
  const map = new Map<string, GradebookSubmission[]>();
  for (const s of submissions) {
    const key = `${s.student_id}::${s.problem_id}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(s);
    else map.set(key, [s]);
  }
  return map;
}

function describeFilters(data: GradebookData, filters: GradebookFilters) {
  const out: string[] = [];
  out.push(
    filters.batchId === "all"
      ? "Batch: all batches"
      : `Batch: ${data.students.find((s) => s.batch_id === filters.batchId)?.batch_name ?? filters.batchId}`,
  );
  out.push(
    filters.moduleId === "all"
      ? "Module: all modules"
      : `Module: ${data.problems.find((p) => p.module_id === filters.moduleId)?.module_code ?? filters.moduleId}`,
  );
  if (filters.from || filters.to)
    out.push(`Window: ${filters.from || "start"} → ${filters.to || "today"}`);
  return out;
}

/* ------------------------------------------------------------- matrix doc */

export function buildMatrixReport(raw: GradebookData, filters: GradebookFilters): ReportDoc {
  const data = applyFilters(raw, filters);
  const index = indexSubmissions(data.submissions);

  const columns = [
    "Roll",
    "Student",
    "Batch",
    "Solved",
    "Attempted",
    ...data.problems.map((p) => p.title),
  ];

  const rows: ReportCell[][] = data.students.map((student) => {
    let solved = 0;
    let attempted = 0;
    const cells: ReportCell[] = data.problems.map((problem) => {
      const cell = summarise(index.get(`${student.id}::${problem.id}`) ?? [], problem);
      if (cell.status === "solved") solved += 1;
      if (cell.status === "attempted") attempted += 1;
      if (cell.status === "not started") return "—";
      const runtime = cell.bestRuntimeMs === null ? "" : ` · ${cell.bestRuntimeMs}ms`;
      const when = cell.lastAt ? ` · ${cell.lastAt.slice(0, 10)}` : "";
      return `${cell.status === "solved" ? "Solved" : cell.bestVerdict} (${cell.attempts})${runtime}${when}`;
    });
    return [
      student.roll_number ?? "—",
      student.full_name,
      student.batch_name ?? "—",
      solved,
      attempted,
      ...cells,
    ];
  });

  const totalSolved = rows.reduce((sum, row) => sum + Number(row[3] ?? 0), 0);

  return {
    slug: "gradebook-matrix",
    title: "Coding practice matrix",
    subtitle: "Per-student, per-problem submission status",
    generatedAt: new Date().toLocaleString(),
    filters: describeFilters(raw, filters),
    summary: [
      { label: "Students", value: String(data.students.length) },
      { label: "Problems", value: String(data.problems.length) },
      { label: "Submissions", value: String(data.submissions.length) },
      {
        label: "Average solved",
        value: data.students.length
          ? (totalSolved / data.students.length).toFixed(1)
          : "0.0",
      },
    ],
    sections: [
      {
        name: "Matrix",
        columns,
        rows,
        note: "Each cell shows verdict, attempt count, best runtime and last submission date.",
      },
    ],
  };
}

/* -------------------------------------------------------------- marks doc */

export function buildMarksReport(raw: GradebookData, filters: GradebookFilters): ReportDoc {
  const data = applyFilters(raw, filters);
  const index = indexSubmissions(data.submissions);
  const maxPoints = data.problems.reduce((sum, p) => sum + p.points, 0);

  const rows: ReportCell[][] = data.students.map((student) => {
    let points = 0;
    let solved = 0;
    let attempts = 0;
    const byLevel: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    for (const problem of data.problems) {
      const cell = summarise(index.get(`${student.id}::${problem.id}`) ?? [], problem);
      points += cell.points;
      attempts += cell.attempts;
      if (cell.status === "solved") {
        solved += 1;
        byLevel[problem.level] = (byLevel[problem.level] ?? 0) + 1;
      }
    }

    const percent = maxPoints ? Math.round((points / maxPoints) * 100) : 0;
    return [
      student.roll_number ?? "—",
      student.full_name,
      student.batch_name ?? "—",
      solved,
      byLevel.easy ?? 0,
      byLevel.medium ?? 0,
      byLevel.hard ?? 0,
      attempts,
      points,
      maxPoints,
      `${percent}%`,
      bandFor(percent),
    ];
  });

  rows.sort((a, b) => Number(b[8]) - Number(a[8]));

  const totals = rows.reduce((sum, row) => sum + Number(row[8]), 0);

  return {
    slug: "gradebook-marks",
    title: "Coding practice marks sheet",
    subtitle: "Points auto-computed from accepted submissions",
    generatedAt: new Date().toLocaleString(),
    filters: describeFilters(raw, filters),
    summary: [
      { label: "Students", value: String(data.students.length) },
      { label: "Marks available", value: String(maxPoints) },
      {
        label: "Class average",
        value: data.students.length ? (totals / data.students.length).toFixed(1) : "0.0",
      },
      {
        label: "Class average %",
        value:
          data.students.length && maxPoints
            ? `${Math.round((totals / data.students.length / maxPoints) * 100)}%`
            : "0%",
      },
    ],
    sections: [
      {
        name: "Marks",
        columns: [
          "Roll",
          "Student",
          "Batch",
          "Solved",
          "Easy",
          "Medium",
          "Hard",
          "Attempts",
          "Marks",
          "Out of",
          "Percent",
          "Band",
        ],
        rows,
        note: "Marks equal the sum of problem points for every accepted problem in the selected window.",
      },
    ],
  };
}
