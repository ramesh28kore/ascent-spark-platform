/**
 * Format-agnostic report builders for the analytics Export Centre.
 *
 * Each builder turns the raw dataset from `getReportData` into a `ReportDoc`
 * that the PDF, Excel and CSV writers in `export-formats.ts` can all render.
 * Readiness numbers reuse `computeReadiness` so exports always match the UI.
 */
import { computeReadiness } from "@/lib/readiness-agg";
import { CO_DEFINITIONS, attainmentLevel } from "@/lib/crt-report";

export type ReportCell = string | number;

export type ReportSection = {
  name: string;
  columns: string[];
  rows: ReportCell[][];
  /** Optional note rendered under the table. */
  note?: string;
};

export type ReportDoc = {
  slug: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  filters: string[];
  summary: { label: string; value: string }[];
  sections: ReportSection[];
};

export type ReportKind = "student" | "batch" | "module";

export type ReportFilters = {
  batchId: string; // "all" or a batches.id
  moduleId: string; // "all" or a modules.id
  from: string; // "" or YYYY-MM-DD
  to: string; // "" or YYYY-MM-DD
};

/* ------------------------------------------------------------ input types */

type Row = Record<string, unknown>;

export type ReportData = {
  students: Row[];
  batches: Row[];
  modules: Row[];
  assessments: Row[];
  scores: Row[];
  attempts: Row[];
  tests: Row[];
  submissions: Row[];
  questions: Row[];
  attendance: Row[];
  sessions: Row[];
  practiceProblems: Row[];
  practiceProgress: Row[];
  mocks: Row[];
};

/* ---------------------------------------------------------------- helpers */

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const pct = (earned: number, possible: number) =>
  possible > 0 ? Math.round((earned / possible) * 100) : 0;
const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

function dayOf(value: unknown): string {
  const raw = str(value);
  return raw ? raw.slice(0, 10) : "";
}

function inWindow(value: unknown, from: string, to: string): boolean {
  const day = dayOf(value);
  if (!day) return !from && !to;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Human-readable description of the applied filters, printed on every export. */
export function describeFilters(data: ReportData, filters: ReportFilters): string[] {
  const out: string[] = [];
  const batch = data.batches.find((b) => b.id === filters.batchId);
  out.push(`Batch: ${filters.batchId === "all" || !batch ? "All batches" : str(batch.name)}`);
  const module = data.modules.find((m) => m.id === filters.moduleId);
  out.push(
    `Module: ${
      filters.moduleId === "all" || !module
        ? "All modules"
        : `${str(module.code)} · ${str(module.title)}`
    }`,
  );
  out.push(
    `Period: ${filters.from || "start"} → ${filters.to || "today"}`.replace(
      "start → today",
      "All time",
    ),
  );
  return out;
}

/**
 * Narrows the dataset to the selected batch, module and date window once,
 * so all three builders read from a consistent slice.
 */
function scope(data: ReportData, filters: ReportFilters) {
  const { batchId, moduleId, from, to } = filters;

  const batchNameById = new Map(data.batches.map((b) => [str(b.id), str(b.name)]));

  const students = data.students.filter((s) => batchId === "all" || str(s.batch_id) === batchId);
  const studentIds = new Set(students.map((s) => str(s.id)));

  const assessments = data.assessments.filter(
    (a) => moduleId === "all" || str(a.module_id) === moduleId,
  );
  const assessmentIds = new Set(assessments.map((a) => str(a.id)));

  const scores = data.scores.filter(
    (r) =>
      studentIds.has(str(r.student_id)) &&
      assessmentIds.has(str(r.assessment_id)) &&
      inWindow(r.recorded_at, from, to),
  );

  const testById = new Map(data.tests.map((t) => [str(t.id), t]));
  const attempts = data.attempts.filter((a) => {
    if (!studentIds.has(str(a.student_id))) return false;
    if (!inWindow(a.submitted_at ?? a.started_at, from, to)) return false;
    if (moduleId === "all") return true;
    return str(testById.get(str(a.test_id))?.module_id) === moduleId;
  });

  const moduleOfQuestion = new Map(data.questions.map((q) => [str(q.id), str(q.module_id)]));
  const submissions = data.submissions.filter((sub) => {
    if (!studentIds.has(str(sub.student_id))) return false;
    if (!inWindow(sub.created_at, from, to)) return false;
    if (moduleId === "all") return true;
    return moduleOfQuestion.get(str(sub.question_id)) === moduleId;
  });

  const sessionById = new Map(data.sessions.map((x) => [str(x.id), x]));
  const attendance = data.attendance.filter((a) => {
    if (!studentIds.has(str(a.student_id))) return false;
    if (!inWindow(a.marked_at, from, to)) return false;
    if (moduleId === "all") return true;
    return str(sessionById.get(str(a.session_id))?.module_id) === moduleId;
  });

  const practiceProblems = data.practiceProblems.filter(
    (p) => moduleId === "all" || str(p.module_id) === moduleId,
  );
  const problemIds = new Set(practiceProblems.map((p) => str(p.id)));
  const practiceProgress = data.practiceProgress.filter(
    (p) => studentIds.has(str(p.student_id)) && problemIds.has(str(p.problem_id)),
  );

  const mocks = data.mocks.filter(
    (m) => studentIds.has(str(m.student_id)) && inWindow(m.held_on, from, to),
  );

  const modules = data.modules.filter((m) => moduleId === "all" || str(m.id) === moduleId);

  return {
    students,
    modules,
    assessments,
    scores,
    attempts,
    submissions,
    attendance,
    practiceProblems,
    practiceProgress,
    mocks,
    moduleOfQuestion,
    batchNameById,
  };
}

function readinessRows(data: ReportData, filters: ReportFilters) {
  const s = scope(data, filters);
  const coreModuleIds = data.modules
    .filter((m) => ["M4"].includes(str(m.code)))
    .map((m) => str(m.id));

  return computeReadiness({
    students: s.students.map((x) => ({
      id: str(x.id),
      full_name: str(x.full_name),
      batch_id: str(x.batch_id) || null,
      batch: s.batchNameById.get(str(x.batch_id)) ?? (str(x.batch) || null),
    })),
    attendance: s.attendance.map((a) => ({
      student_id: str(a.student_id),
      present: Boolean(a.present),
    })),
    attempts: s.attempts.map((a) => ({
      student_id: str(a.student_id),
      score: num(a.score),
      max_score: num(a.max_score),
      submitted_at: a.submitted_at ? str(a.submitted_at) : null,
    })),
    practiceProblems: s.practiceProblems.map((p) => ({ id: str(p.id), points: num(p.points) })),
    practiceProgress: s.practiceProgress.map((p) => ({
      student_id: str(p.student_id),
      problem_id: str(p.problem_id),
      status: str(p.status),
    })),
    mocks: s.mocks.map((m) => ({ student_id: str(m.student_id), rating: num(m.rating) })),
    scores: s.scores.map((x) => ({
      student_id: str(x.student_id),
      assessment_id: str(x.assessment_id),
      marks: num(x.marks),
    })),
    assessments: data.assessments.map((a) => ({
      id: str(a.id),
      module_id: str(a.module_id) || null,
      max_marks: num(a.max_marks),
    })),
    coreModuleIds,
  });
}

/** Per-student, per-module attainment percentage across scores and coding work. */
function moduleMatrix(data: ReportData, filters: ReportFilters) {
  const s = scope(data, filters);
  const assessmentById = new Map(data.assessments.map((a) => [str(a.id), a]));
  const grid = new Map<string, Map<string, { earned: number; possible: number }>>();

  const bump = (studentId: string, moduleId: string, earned: number, possible: number) => {
    if (!moduleId || possible <= 0) return;
    const row = grid.get(studentId) ?? new Map();
    const cell = row.get(moduleId) ?? { earned: 0, possible: 0 };
    row.set(moduleId, { earned: cell.earned + earned, possible: cell.possible + possible });
    grid.set(studentId, row);
  };

  for (const row of s.scores) {
    const a = assessmentById.get(str(row.assessment_id));
    if (a) bump(str(row.student_id), str(a.module_id), num(row.marks), num(a.max_marks));
  }
  for (const sub of s.submissions) {
    bump(
      str(sub.student_id),
      s.moduleOfQuestion.get(str(sub.question_id)) ?? "",
      num(sub.ai_score),
      num(sub.max_score),
    );
  }
  return grid;
}

/* --------------------------------------------------------- student report */

function buildStudentWise(data: ReportData, filters: ReportFilters): ReportDoc {
  const s = scope(data, filters);
  const readiness = readinessRows(data, filters);
  const grid = moduleMatrix(data, filters);
  const readinessById = new Map(readiness.map((r) => [r.student_id, r]));
  const modules = [...s.modules].sort((a, b) => num(a.sort_order) - num(b.sort_order));

  const columns = [
    "Roll number",
    "Name",
    "Branch",
    "Batch",
    "Attendance %",
    "Weekly tests %",
    "Coding %",
    "Mock rating",
    "Core %",
    "Readiness",
    "Band",
    ...modules.map((m) => `${str(m.code)} %`),
  ];

  const rows: ReportCell[][] = s.students
    .map((student) => {
      const id = str(student.id);
      const r = readinessById.get(id);
      const cells = grid.get(id);
      return {
        sort: r?.score ?? 0,
        row: [
          str(student.roll_number) || "—",
          str(student.full_name),
          str(student.branch) || "—",
          s.batchNameById.get(str(student.batch_id)) ?? str(student.batch) ?? "—",
          r?.attendancePct ?? 0,
          r?.testAvg ?? 0,
          r?.codingScore ?? 0,
          r?.mockRating ?? 0,
          r?.coreAvg ?? 0,
          r?.score ?? 0,
          r?.band ?? "Needs Work",
          ...modules.map((m) => {
            const cell = cells?.get(str(m.id));
            return cell ? pct(cell.earned, cell.possible) : "—";
          }),
        ] as ReportCell[],
      };
    })
    .sort((a, b) => b.sort - a.sort)
    .map((x) => x.row);

  const ready = readiness.filter((r) => r.band === "Ready").length;
  const risk = readiness.filter((r) => r.band === "Needs Work").length;

  return {
    slug: "student-wise",
    title: "Student-wise CRT report",
    subtitle: "Pillar-wise performance and placement readiness for every student in scope.",
    generatedAt: new Date().toLocaleString(),
    filters: describeFilters(data, filters),
    summary: [
      { label: "Students", value: String(s.students.length) },
      { label: "Average readiness", value: `${avg(readiness.map((r) => r.score))}` },
      { label: "Ready", value: String(ready) },
      { label: "Needs work", value: String(risk) },
    ],
    sections: [
      {
        name: "Students",
        columns,
        rows,
        note: "Readiness = attendance 15% + weekly tests 30% + coding 30% + mock interview 15% + core subjects 10%.",
      },
    ],
  };
}

/* ----------------------------------------------------------- batch report */

function buildBatchWise(data: ReportData, filters: ReportFilters): ReportDoc {
  const s = scope(data, filters);
  const readiness = readinessRows(data, filters);
  const byId = new Map(readiness.map((r) => [r.student_id, r]));

  const groups = new Map<string, { name: string; rows: typeof readiness }>();
  for (const student of s.students) {
    const key = str(student.batch_id) || "unassigned";
    const name = s.batchNameById.get(str(student.batch_id)) ?? str(student.batch) ?? "Unassigned";
    const bucket = groups.get(key) ?? { name, rows: [] };
    const r = byId.get(str(student.id));
    if (r) bucket.rows.push(r);
    groups.set(key, bucket);
  }

  const columns = [
    "Batch",
    "Students",
    "Avg readiness",
    "Ready",
    "Near-ready",
    "Needs work",
    "Attendance %",
    "Weekly tests %",
    "Coding %",
    "Mock rating",
    "Top performer",
    "Lowest",
  ];

  const rows: ReportCell[][] = [...groups.values()]
    .filter((g) => g.rows.length > 0)
    .map((g) => {
      const sorted = [...g.rows].sort((a, b) => b.score - a.score);
      return [
        g.name,
        g.rows.length,
        avg(g.rows.map((r) => r.score)),
        g.rows.filter((r) => r.band === "Ready").length,
        g.rows.filter((r) => r.band === "Near-Ready").length,
        g.rows.filter((r) => r.band === "Needs Work").length,
        avg(g.rows.map((r) => r.attendancePct)),
        avg(g.rows.map((r) => r.testAvg)),
        avg(g.rows.map((r) => r.codingScore)),
        avg(g.rows.map((r) => r.mockRating)),
        `${sorted[0].full_name} (${sorted[0].score})`,
        `${sorted[sorted.length - 1].full_name} (${sorted[sorted.length - 1].score})`,
      ];
    })
    .sort((a, b) => num(b[2]) - num(a[2]));

  const detail: ReportSection[] = [...groups.values()]
    .filter((g) => g.rows.length > 0)
    .map((g) => ({
      name: g.name.slice(0, 28) || "Batch",
      columns: [
        "Name",
        "Attendance %",
        "Tests %",
        "Coding %",
        "Mock",
        "Core %",
        "Readiness",
        "Band",
      ],
      rows: [...g.rows]
        .sort((a, b) => b.score - a.score)
        .map((r) => [
          r.full_name,
          r.attendancePct,
          r.testAvg,
          r.codingScore,
          r.mockRating,
          r.coreAvg,
          r.score,
          r.band,
        ]),
    }));

  return {
    slug: "batch-wise",
    title: "Batch-wise CRT report",
    subtitle: "Readiness bands and pillar averages compared across batches.",
    generatedAt: new Date().toLocaleString(),
    filters: describeFilters(data, filters),
    summary: [
      { label: "Batches", value: String(rows.length) },
      { label: "Students", value: String(readiness.length) },
      { label: "Average readiness", value: `${avg(readiness.map((r) => r.score))}` },
      {
        label: "Below 75% attendance",
        value: String(readiness.filter((r) => r.attendancePct < 75).length),
      },
    ],
    sections: [{ name: "Summary", columns, rows }, ...detail],
  };
}

/* ---------------------------------------------------------- module report */

function buildModuleWise(data: ReportData, filters: ReportFilters): ReportDoc {
  const s = scope(data, filters);
  const grid = moduleMatrix(data, filters);
  const assessmentById = new Map(data.assessments.map((a) => [str(a.id), a]));
  const modules = [...s.modules].sort((a, b) => num(a.sort_order) - num(b.sort_order));

  const totals = new Map<string, { earned: number; possible: number; learners: Set<string> }>();
  const bump = (moduleId: string, studentId: string, earned: number, possible: number) => {
    if (!moduleId || possible <= 0) return;
    const cell = totals.get(moduleId) ?? { earned: 0, possible: 0, learners: new Set<string>() };
    cell.earned += earned;
    cell.possible += possible;
    cell.learners.add(studentId);
    totals.set(moduleId, cell);
  };
  for (const row of s.scores) {
    const a = assessmentById.get(str(row.assessment_id));
    if (a) bump(str(a.module_id), str(row.student_id), num(row.marks), num(a.max_marks));
  }
  for (const sub of s.submissions) {
    bump(
      s.moduleOfQuestion.get(str(sub.question_id)) ?? "",
      str(sub.student_id),
      num(sub.ai_score),
      num(sub.max_score),
    );
  }

  const columns = [
    "Module",
    "Title",
    "CO",
    "Weight %",
    "Learners",
    "Assessments",
    "Attainment %",
    "Level (0-3)",
    "Below 50%",
    "Status",
  ];

  const rows: ReportCell[][] = modules.map((m) => {
    const id = str(m.id);
    const cell = totals.get(id);
    const percent = cell ? pct(cell.earned, cell.possible) : 0;
    const below = s.students.filter((student) => {
      const own = grid.get(str(student.id))?.get(id);
      return own && pct(own.earned, own.possible) < 50;
    }).length;
    const co = CO_DEFINITIONS[str(m.code)];
    return [
      str(m.code),
      str(m.title),
      co?.co ?? "—",
      num(m.weight_percent),
      cell ? cell.learners.size : 0,
      data.assessments.filter((a) => str(a.module_id) === id).length,
      cell ? percent : "—",
      cell ? attainmentLevel(percent) : "—",
      below,
      !cell ? "No data" : percent < 50 ? "Critical" : percent < 65 ? "Watch" : "On track",
    ];
  });

  const graded = rows.filter((r) => r[6] !== "—");

  const coSection: ReportSection = {
    name: "CO attainment",
    columns: ["Module", "CO", "Course outcome statement", "Attainment %", "Level"],
    rows: modules
      .filter((m) => CO_DEFINITIONS[str(m.code)])
      .map((m) => {
        const cell = totals.get(str(m.id));
        const percent = cell ? pct(cell.earned, cell.possible) : 0;
        const co = CO_DEFINITIONS[str(m.code)];
        return [
          str(m.code),
          co.co,
          co.statement,
          cell ? percent : "—",
          cell ? attainmentLevel(percent) : "—",
        ];
      }),
  };

  return {
    slug: "module-wise",
    title: "Module-wise CRT report",
    subtitle: "Attainment per module with mapped course outcomes and revision priorities.",
    generatedAt: new Date().toLocaleString(),
    filters: describeFilters(data, filters),
    summary: [
      { label: "Modules in scope", value: String(modules.length) },
      { label: "Modules with data", value: String(graded.length) },
      { label: "Average attainment", value: `${avg(graded.map((r) => num(r[6])))}%` },
      {
        label: "Critical modules",
        value: String(graded.filter((r) => num(r[6]) < 50).length),
      },
    ],
    sections: [
      {
        name: "Modules",
        columns,
        rows,
        note: "Attainment level: 3 = 70%+, 2 = 60%+, 1 = 50%+, 0 = below target.",
      },
      coSection,
    ],
  };
}

/* ------------------------------------------------------------------ entry */

export function buildReport(kind: ReportKind, data: ReportData, filters: ReportFilters): ReportDoc {
  if (kind === "batch") return buildBatchWise(data, filters);
  if (kind === "module") return buildModuleWise(data, filters);
  return buildStudentWise(data, filters);
}
