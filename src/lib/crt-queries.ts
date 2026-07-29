import { queryOptions } from "@tanstack/react-query";
import {
  getMe,
  getModules,
  getStudents,
  getAssessments,
  getScores,
  getQuestions,
  getCodingProblems,
} from "@/lib/crt.functions";

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
export const modulesQuery = queryOptions({ queryKey: ["modules"], queryFn: () => getModules() });
export const studentsQuery = queryOptions({ queryKey: ["students"], queryFn: () => getStudents() });
export const assessmentsQuery = queryOptions({
  queryKey: ["assessments"],
  queryFn: () => getAssessments(),
});
export const scoresQuery = queryOptions({ queryKey: ["scores"], queryFn: () => getScores() });
export const questionsQuery = queryOptions({
  queryKey: ["questions"],
  queryFn: () => getQuestions(),
});
export const codingQuery = queryOptions({
  queryKey: ["coding"],
  queryFn: () => getCodingProblems(),
});

export const KIND_LABEL: Record<string, string> = {
  weekly_test: "Weekly test",
  mock_nqt: "Mock NQT",
  coding_test: "Coding test",
  interview: "Interview",
};

export function pct(value: number, max: number) {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}
