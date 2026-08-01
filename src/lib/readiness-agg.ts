import { readinessIndex, practiceScore, type ReadinessBand } from "@/lib/readiness";

export type AggInputs = {
  students: { id: string; full_name: string; batch_id?: string | null; batch?: string | null }[];
  attendance: { student_id: string; present: boolean }[];
  attempts: {
    student_id: string;
    score: number | string;
    max_score: number | string;
    submitted_at: string | null;
  }[];
  practiceProblems: { id: string; points: number }[];
  practiceProgress: { student_id: string; problem_id: string; status: string }[];
  mocks: { student_id: string; rating: number | string }[];
  scores: { student_id: string; assessment_id: string; marks: number | string }[];
  assessments: { id: string; module_id: string | null; max_marks: number }[];
  coreModuleIds: string[];
};

export type StudentReadiness = {
  student_id: string;
  full_name: string;
  batch: string | null;
  attendancePct: number;
  sessionsAttended: number;
  sessionsTotal: number;
  testAvg: number;
  codingScore: number;
  solved: number;
  mockRating: number;
  coreAvg: number;
  score: number;
  band: ReadinessBand;
};

const n = (v: number | string) => (typeof v === "number" ? v : Number(v) || 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeReadiness(input: AggInputs): StudentReadiness[] {
  const totalPoints = input.practiceProblems.reduce((a, p) => a + p.points, 0);
  const pointsById = new Map(input.practiceProblems.map((p) => [p.id, p.points]));
  const assessmentById = new Map(input.assessments.map((a) => [a.id, a]));
  const coreSet = new Set(input.coreModuleIds);

  return input.students.map((s) => {
    const att = input.attendance.filter((a) => a.student_id === s.id);
    const present = att.filter((a) => a.present).length;
    const attendancePct = att.length ? (present / att.length) * 100 : 0;

    const done = input.attempts.filter((a) => a.student_id === s.id && a.submitted_at);
    const testAvg = avg(
      done.map((a) => (n(a.max_score) ? (n(a.score) / n(a.max_score)) * 100 : 0)),
    );

    const solvedRows = input.practiceProgress.filter(
      (p) => p.student_id === s.id && p.status === "solved",
    );
    const solvedPoints = solvedRows.reduce((a, p) => a + (pointsById.get(p.problem_id) ?? 0), 0);

    const mockRows = input.mocks.filter((m) => m.student_id === s.id);
    const mockRating = avg(mockRows.map((m) => n(m.rating)));

    const coreRows = input.scores.filter((sc) => {
      if (sc.student_id !== s.id) return false;
      const a = assessmentById.get(sc.assessment_id);
      return !!a?.module_id && coreSet.has(a.module_id);
    });
    const coreAvg = avg(
      coreRows.map((sc) => {
        const a = assessmentById.get(sc.assessment_id)!;
        return a.max_marks ? (n(sc.marks) / a.max_marks) * 100 : 0;
      }),
    );

    const codingScore = practiceScore(solvedPoints, totalPoints);
    const { score, band } = readinessIndex({
      attendancePct,
      testAvg,
      codingScore,
      mockRating,
      coreAvg,
    });

    return {
      student_id: s.id,
      full_name: s.full_name,
      batch: s.batch ?? null,
      attendancePct: Math.round(attendancePct),
      sessionsAttended: present,
      sessionsTotal: att.length,
      testAvg: Math.round(testAvg),
      codingScore: Math.round(codingScore),
      solved: solvedRows.length,
      mockRating: Math.round(mockRating),
      coreAvg: Math.round(coreAvg),
      score,
      band,
    };
  });
}
