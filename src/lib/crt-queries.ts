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
import {
  getBatches,
  getSessions,
  getAttendance,
  getMockInterviews,
  getPractice,
  getResources,
  getNotifications,
  getRoleAssignments,
} from "@/lib/crt-ops.functions";
import { getTests } from "@/lib/tests.functions";

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

export const batchesQuery = queryOptions({ queryKey: ["batches"], queryFn: () => getBatches() });
export const sessionsQuery = queryOptions({ queryKey: ["sessions"], queryFn: () => getSessions() });
export const attendanceQuery = queryOptions({
  queryKey: ["attendance"],
  queryFn: () => getAttendance(),
});
export const mocksQuery = queryOptions({
  queryKey: ["mock-interviews"],
  queryFn: () => getMockInterviews(),
});
export const practiceQuery = queryOptions({ queryKey: ["practice"], queryFn: () => getPractice() });
export const resourcesQuery = queryOptions({
  queryKey: ["resources"],
  queryFn: () => getResources(),
});
export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => getNotifications(),
});
export const rolesQuery = queryOptions({
  queryKey: ["role-assignments"],
  queryFn: () => getRoleAssignments(),
});
export const testsQuery = queryOptions({ queryKey: ["tests"], queryFn: () => getTests() });


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
