import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Flame, Medal } from "lucide-react";

import { problemProfileQuery } from "@/lib/crt-queries";
import { LEVEL_TONE, VERDICT_TONE } from "@/lib/problems-shared";
import {
  SubmissionHeatmap,
  countByDay,
  streakFromCounts,
} from "@/components/leetcode/SubmissionHeatmap";

import { EmptyState } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCard } from "@/components/leetcode/BadgeCard";
import { useAchievements } from "@/lib/use-achievements";
import { AchievementTimeline } from "@/components/leetcode/AchievementTimeline";

export const Route = createFileRoute("/_authenticated/problems/profile")({
  head: () => ({
    meta: [
      { title: "My coding progress — CRT Training Console" },
      {
        name: "description",
        content:
          "Personal coding progress: solved counts by difficulty, topic mastery, submission heatmap and streak.",
      },
      { property: "og:title", content: "My coding progress — CRT Training Console" },
      {
        property: "og:description",
        content: "Track solved problems, topic mastery and your daily submission streak.",
      },
    ],
  }),
  component: ProblemProfilePage,
});

function ProblemProfilePage() {
  const profile = useQuery(problemProfileQuery);
  const { badges, unlocked, timeline } = useAchievements();
  const submissions = profile.data?.submissions ?? [];
  const problems = profile.data?.problems ?? [];

  const solvedIds = useMemo(
    () => new Set(submissions.filter((s) => s.verdict === "accepted").map((s) => s.problem_id)),
    [submissions],
  );

  const byLevel = useMemo(
    () =>
      (["easy", "medium", "hard"] as const).map((level) => {
        const all = problems.filter((p) => p.level === level);
        return {
          level,
          solved: all.filter((p) => solvedIds.has(p.id)).length,
          total: all.length,
        };
      }),
    [problems, solvedIds],
  );

  const byTopic = useMemo(() => {
    const map = new Map<string, { solved: number; total: number }>();
    for (const p of problems) {
      for (const tag of p.tags.length ? p.tags : [p.category ?? "General"]) {
        const entry = map.get(tag) ?? { solved: 0, total: 0 };
        entry.total += 1;
        if (solvedIds.has(p.id)) entry.solved += 1;
        map.set(tag, entry);
      }
    }
    return [...map.entries()]
      .map(([topic, v]) => ({ topic, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [problems, solvedIds]);

  const counts = useMemo(() => countByDay(submissions.map((s) => s.created_at)), [submissions]);

  const streak = useMemo(() => streakFromCounts(counts), [counts]);

  if (profile.isLoading) return <Skeleton className="h-96 w-full" />;

  const titleFor = (id: string) => problems.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems">
            <ArrowLeft className="size-4" /> Problem set
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold tracking-tight">My coding progress</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Solved</CardTitle>
            <CardDescription>
              {solvedIds.size} of {problems.length} problems
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byLevel.map((row) => (
              <div key={row.level} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium capitalize ${LEVEL_TONE[row.level]}`}>
                    {row.level}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.solved}/{row.total}
                  </span>
                </div>
                <Progress
                  value={row.total ? (row.solved / row.total) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>{submissions.length} submissions in total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="flex items-center gap-2 text-2xl font-bold tabular-nums">
              <Flame className="size-5 text-amber-500" /> {streak}
              <span className="text-sm font-normal text-muted-foreground">day streak</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Accepted: {submissions.filter((s) => s.verdict === "accepted").length} · Acceptance{" "}
              {submissions.length
                ? Math.round(
                    (submissions.filter((s) => s.verdict === "accepted").length /
                      submissions.length) *
                      100,
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Topic mastery</CardTitle>
            <CardDescription>Solved share per topic</CardDescription>
          </CardHeader>
          <CardContent className="max-h-56 space-y-2 overflow-auto">
            {byTopic.map((row) => (
              <div key={row.topic} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{row.topic}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.solved}/{row.total}
                  </span>
                </div>
                <Progress
                  value={row.total ? (row.solved / row.total) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            ))}
            {byTopic.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Medal className="size-4 text-amber-500" /> Achievements
            </CardTitle>
            <CardDescription className="tabular-nums">
              {unlocked.length}/{badges.length} badges unlocked
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/achievements">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {unlocked.slice(0, 4).map((badge) => (
            <BadgeCard key={badge.id} badge={badge} compact />
          ))}
          {unlocked.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No badges yet — solve a problem to unlock your first one.
            </p>
          )}
        </CardContent>
        {timeline.length > 0 && (
          <CardContent className="border-t pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recently earned
            </p>
            <AchievementTimeline events={timeline} limit={3} showMonths={false} />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Submission heatmap</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <SubmissionHeatmap counts={counts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {submissions.slice(0, 20).map((s) => {
            const problem = titleFor(s.problem_id);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <Link
                  to="/problems/$slug"
                  params={{ slug: problem?.slug ?? "" }}
                  className="truncate hover:underline"
                >
                  {problem?.title ?? "Problem"}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{s.language}</Badge>
                  <span
                    className={`text-xs font-medium capitalize ${VERDICT_TONE[s.verdict] ?? ""}`}
                  >
                    {s.verdict}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </span>
              </div>
            );
          })}
          {submissions.length === 0 && (
            <EmptyState
              icon={Flame}
              title="No submissions yet"
              description="Solve today's challenge to start your streak."
              action={
                <Button asChild size="sm">
                  <Link to="/problems">Browse problems</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
