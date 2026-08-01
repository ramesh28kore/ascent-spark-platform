import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { myContestStatsQuery, problemProfileQuery, problemsQuery } from "@/lib/crt-queries";
import { computeAchievements } from "@/lib/achievements";
import { countByDay, streakFromCounts } from "@/components/leetcode/SubmissionHeatmap";

/** Derives the student's badge collection from data already cached by TanStack Query. */
export function useAchievements() {
  const problems = useQuery(problemsQuery);
  const profile = useQuery(problemProfileQuery);
  const contest = useQuery(myContestStatsQuery);

  const rows = problems.data?.problems ?? [];
  const submissions = profile.data?.submissions ?? [];

  const badges = useMemo(() => {
    const solvedRows = rows.filter((p) => p.status === "solved");
    const count = (level: string) => solvedRows.filter((p) => p.level === level).length;
    const streak = streakFromCounts(countByDay(submissions.map((s) => s.created_at)));

    return computeAchievements({
      solved: {
        easy: count("easy"),
        medium: count("medium"),
        hard: count("hard"),
        total: solvedRows.length,
      },
      submissions: submissions.map((s) => ({ verdict: s.verdict, created_at: s.created_at })),
      streak,
      contest: {
        registered: contest.data?.registered ?? 0,
        participated: contest.data?.participated ?? 0,
        bestRank: contest.data?.bestRank ?? null,
        wins: contest.data?.wins ?? 0,
      },
    });
  }, [rows, submissions, contest.data]);

  return {
    badges,
    unlocked: badges.filter((b) => b.unlocked),
    isLoading: problems.isLoading || profile.isLoading,
  };
}
