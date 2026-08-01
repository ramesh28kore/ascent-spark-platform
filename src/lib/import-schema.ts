export type DatasetKey =
  | "students"
  | "modules"
  | "topics"
  | "assessments"
  | "questions"
  | "coding"
  | "scores"
  | "batches"
  | "sessions"
  | "attendance";

export type FieldSpec = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

export type DatasetSpec = {
  key: DatasetKey;
  label: string;
  description: string;
  fields: FieldSpec[];
  sample: Record<string, string>;
};

export const DATASETS: DatasetSpec[] = [
  {
    key: "students",
    label: "Students",
    description:
      "Batch roster. Matched on roll number (or email) so re-uploads update instead of duplicating.",
    fields: [
      { key: "full_name", label: "full_name", required: true },
      { key: "roll_number", label: "roll_number", hint: "unique key" },
      { key: "email", label: "email" },
      { key: "branch", label: "branch" },
      { key: "year", label: "year" },
      { key: "batch", label: "batch" },
    ],
    sample: {
      full_name: "Ananya Krishnan",
      roll_number: "21CS001",
      email: "ananya@college.edu",
      branch: "CSE",
      year: "IV",
      batch: "CRT-2026-A",
    },
  },
  {
    key: "modules",
    label: "Modules",
    description: "Syllabus modules M1-M7. Matched on module code.",
    fields: [
      { key: "code", label: "code", required: true, hint: "unique key, e.g. M1" },
      { key: "title", label: "title", required: true },
      { key: "description", label: "description" },
      { key: "hours", label: "hours" },
      { key: "weight_percent", label: "weight_percent" },
      { key: "deliverable", label: "deliverable" },
      { key: "sort_order", label: "sort_order" },
    ],
    sample: {
      code: "M8",
      title: "Advanced SQL",
      description: "Joins, windows, query tuning",
      hours: "12",
      weight_percent: "10",
      deliverable: "SQL case study",
      sort_order: "8",
    },
  },
  {
    key: "topics",
    label: "Module topics",
    description: "Topics inside a module, linked by module code.",
    fields: [
      { key: "module_code", label: "module_code", required: true },
      { key: "title", label: "title", required: true },
      { key: "hours", label: "hours" },
      { key: "sort_order", label: "sort_order" },
    ],
    sample: { module_code: "M8", title: "Window functions", hours: "2", sort_order: "1" },
  },
  {
    key: "assessments",
    label: "Assessments",
    description: "Scheduled tests. Matched on title.",
    fields: [
      { key: "title", label: "title", required: true, hint: "unique key" },
      { key: "kind", label: "kind", hint: "weekly_test | mock_nqt | coding_test | interview" },
      { key: "module_code", label: "module_code" },
      { key: "max_marks", label: "max_marks" },
      { key: "scheduled_on", label: "scheduled_on", hint: "YYYY-MM-DD" },
    ],
    sample: {
      title: "Week 8 - SQL test",
      kind: "weekly_test",
      module_code: "M8",
      max_marks: "30",
      scheduled_on: "2026-08-14",
    },
  },
  {
    key: "questions",
    label: "Question bank",
    description: "MCQ / coding / descriptive items with Bloom tagging.",
    fields: [
      { key: "prompt", label: "prompt", required: true },
      { key: "module_code", label: "module_code" },
      { key: "qtype", label: "qtype", hint: "mcq | coding | descriptive" },
      { key: "options", label: "options", hint: "pipe separated: A|B|C|D" },
      { key: "answer", label: "answer" },
      { key: "explanation", label: "explanation" },
      { key: "level", label: "level", hint: "easy | medium | hard" },
      { key: "bloom", label: "bloom", hint: "L1..L6" },
      { key: "marks", label: "marks" },
    ],
    sample: {
      prompt: "Which SQL clause limits grouped rows?",
      module_code: "M8",
      qtype: "mcq",
      options: "WHERE|HAVING|LIMIT|ORDER BY",
      answer: "HAVING",
      explanation: "HAVING filters after GROUP BY.",
      level: "easy",
      bloom: "L1",
      marks: "1",
    },
  },
  {
    key: "coding",
    label: "Coding problems",
    description: "Practice library entries. Matched on title.",
    fields: [
      { key: "title", label: "title", required: true, hint: "unique key" },
      { key: "module_code", label: "module_code" },
      { key: "pattern", label: "pattern" },
      { key: "level", label: "level", hint: "easy | medium | hard" },
      { key: "problem", label: "problem", required: true },
      { key: "approach", label: "approach" },
      { key: "code", label: "code" },
      { key: "expected_output", label: "expected_output" },
      { key: "complexity", label: "complexity" },
      { key: "follow_ups", label: "follow_ups" },
    ],
    sample: {
      title: "Two sum",
      module_code: "M2",
      pattern: "Hashing",
      level: "easy",
      problem: "Return indices of two numbers adding to target.",
      approach: "Store complements in a dict.",
      code: "def two_sum(nums, t):\n    seen = {}",
      expected_output: "[0, 1]",
      complexity: "O(n) time, O(n) space",
      follow_ups: "What if the array is sorted?",
    },
  },
  {
    key: "scores",
    label: "Scores",
    description: "Marks per student per assessment; both must already exist.",
    fields: [
      { key: "roll_number", label: "roll_number", required: true },
      { key: "assessment_title", label: "assessment_title", required: true },
      { key: "marks", label: "marks", required: true },
      { key: "attempts", label: "attempts" },
    ],
    sample: {
      roll_number: "21CS001",
      assessment_title: "Week 8 - SQL test",
      marks: "26",
      attempts: "1",
    },
  },
  {
    key: "batches",
    label: "Batches",
    description: "Cohorts per academic year. Matched on batch name.",
    fields: [
      { key: "name", label: "name", required: true, hint: "unique key" },
      { key: "academic_year", label: "academic_year" },
      { key: "branch", label: "branch" },
      { key: "active", label: "active", hint: "true | false" },
    ],
    sample: {
      name: "CRT-2026-A",
      academic_year: "2025-26",
      branch: "CSE",
      active: "true",
    },
  },
  {
    key: "sessions",
    label: "Sessions",
    description: "Training timetable. Matched on title + scheduled_at.",
    fields: [
      { key: "title", label: "title", required: true },
      { key: "scheduled_at", label: "scheduled_at", required: true, hint: "2026-01-12 10:00" },
      { key: "batch", label: "batch", hint: "existing batch name" },
      { key: "module_code", label: "module_code" },
      { key: "trainer_name", label: "trainer_name" },
      { key: "duration_min", label: "duration_min" },
      { key: "status", label: "status", hint: "planned | conducted | cancelled" },
    ],
    sample: {
      title: "Arrays and strings drill",
      scheduled_at: "2026-01-12 10:00",
      batch: "CRT-2026-A",
      module_code: "M2",
      trainer_name: "R. Sharma",
      duration_min: "90",
      status: "planned",
    },
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Presence per student per session; both must already exist.",
    fields: [
      { key: "roll_number", label: "roll_number", required: true },
      { key: "session_title", label: "session_title", required: true },
      { key: "scheduled_at", label: "scheduled_at", hint: "optional disambiguator" },
      { key: "present", label: "present", hint: "true | false" },
    ],
    sample: {
      roll_number: "21CS001",
      session_title: "Arrays and strings drill",
      scheduled_at: "2026-01-12 10:00",
      present: "true",
    },
  },
];

export function datasetSpec(key: DatasetKey) {
  return DATASETS.find((d) => d.key === key)!;
}
