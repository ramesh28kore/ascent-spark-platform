import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { myContestStatsQuery, problemProfileQuery, problemsQuery } from "@/lib/crt-queries";
import { computeAchievements, computeAchievementTimeline } from "@/lib/achievements";
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

  const timeline = useMemo(
    () =>
      computeAchievementTimeline(
        badges,
        submissions.map((s) => ({
          id: s.id,
          problem_id: s.problem_id,
          verdict: s.verdict,
          created_at: s.created_at,
        })),
        (profile.data?.problems ?? []).map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          level: p.level,
        })),
        contest.data?.contests ?? [],
      ),
    [badges, submissions, profile.data, contest.data],
  );

  return {
    badges,
    timeline,
    unlocked: badges.filter((b) => b.unlocked),
    isLoading: problems.isLoading || profile.isLoading,
  };
}
