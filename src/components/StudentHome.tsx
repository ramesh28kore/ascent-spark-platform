import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarClock, Flame, ListChecks, Medal, Play, Target, Trophy } from "lucide-react";

import {
  assessmentsQuery,
  meQuery,
  problemProfileQuery,
  problemsQuery,
  scoresQuery,
  pct,
} from "@/lib/crt-queries";
import { LEVEL_TONE, VERDICT_TONE } from "@/lib/problems-shared";
import { ProgressRing } from "@/components/leetcode/ProgressRing";
import {
  SubmissionHeatmap,
  countByDay,
  streakFromCounts,
} from "@/components/leetcode/SubmissionHeatmap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCard } from "@/components/leetcode/BadgeCard";
import { nextUp } from "@/lib/achievements";
import { useAchievements } from "@/lib/use-achievements";

const LEVELS = ["easy", "medium", "hard"] as const;

/** Stable per-day index so the daily challenge does not change on re-render. */
function dailyIndex(length: number) {
  if (!length) return 0;
  const key = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  return hash % length;
}

/** LeetCode-style home for students: solved ring, daily problem, streak, heatmap. */
export function StudentHome() {
  const me = useQuery(meQuery);
  const { badges, unlocked } = useAchievements();
  const problems = useQuery(problemsQuery);
  const profile = useQuery(problemProfileQuery);
  const assessments = useQuery(assessmentsQuery);
  const scores = useQuery(scoresQuery);

  const rows = problems.data?.problems ?? [];
  const submissions = profile.data?.submissions ?? [];

  const counts = useMemo(() => countByDay(submissions.map((s) => s.created_at)), [submissions]);
  const streak = useMemo(() => streakFromCounts(counts), [counts]);

  const byLevel = useMemo(
    () =>
      LEVELS.map((level) => {
        const all = rows.filter((p) => p.level === level);
        return {
          level,
          solved: all.filter((p) => p.status === "solved").length,
          total: all.length,
        };
      }),
    [rows],
  );

  const solvedTotal = rows.filter((p) => p.status === "solved").length;

  const daily = useMemo(() => {
    const pool = rows.filter((p) => p.status !== "solved");
    const source = pool.length ? pool : rows;
    return source[dailyIndex(source.length)];
  }, [rows]);

  const continueList = useMemo(
    () =>
      [...rows]
        .filter((p) => p.status !== "solved")
        .sort((a, b) => (a.status === "attempted" ? -1 : 0) - (b.status === "attempted" ? -1 : 0))
        .slice(0, 4),
    [rows],
  );

  const byTopic = useMemo(() => {
    const map = new Map<string, { solved: number; total: number }>();
    for (const p of rows) {
      for (const tag of p.tags.length ? p.tags : [p.category ?? "General"]) {
        const entry = map.get(tag) ?? { solved: 0, total: 0 };
        entry.total += 1;
        if (p.status === "solved") entry.solved += 1;
        map.set(tag, entry);
      }
    }
    return [...map.entries()]
      .map(([topic, v]) => ({ topic, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [rows]);

  const accepted = submissions.filter((s) => s.verdict === "accepted").length;
  const acceptance = submissions.length ? Math.round((accepted / submissions.length) * 100) : 0;

  const problemTitle = (id: string) =>
    profile.data?.problems.find((p) => p.id === id) ?? rows.find((p) => p.id === id);

  /* -------- small training snapshot from the CRT side -------- */
  const list = assessments.data ?? [];
  const myId = me.data?.profile?.id;
  const myScores = (scores.data ?? []).filter((s) => s.student_id === myId);
  const avgScore = myScores.length
    ? Math.round(
        myScores.reduce((sum, s) => {
          const a = list.find((x) => x.id === s.assessment_id);
          return sum + (a ? pct(Number(s.marks), a.max_marks) : 0);
        }, 0) / myScores.length,
      )
    : 0;
  const nextAssessment = list
    .filter((a) => new Date(a.scheduled_on) >= new Date(Date.now() - 86400000))
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on))[0];

  if (problems.isLoading || profile.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Hello, {me.data?.profile?.full_name ?? "student"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep the streak alive — solve, submit and climb the difficulty ladder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {daily?.slug ? (
            <Button asChild size="sm" className="gap-2">
              <Link to="/problems/$slug" params={{ slug: daily.slug }}>
                <Play className="size-4" /> Solve daily problem
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/problems">
              <ListChecks className="size-4" /> Problem set
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-5 p-5">
            <ProgressRing solved={solvedTotal} total={rows.length} />
            <div className="flex-1 space-y-2">
              {byLevel.map((row) => (
                <div key={row.level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium capitalize ${LEVEL_TONE[row.level]}`}>
                      {row.level}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.solved}/{row.total}
                    </span>
                  </div>
                  <Progress value={row.total ? (row.solved / row.total) * 100 : 0} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Daily challenge</CardTitle>
            <CardDescription>{new Date().toDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {daily ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                <div className="min-w-0">
                  <Link
                    to="/problems/$slug"
                    params={{ slug: daily.slug ?? "" }}
                    className="font-display text-lg font-semibold hover:underline"
                  >
                    {daily.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-medium capitalize ${LEVEL_TONE[daily.level]}`}>
                      {daily.level}
                    </span>
                    {daily.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>

                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/problems/$slug" params={{ slug: daily.slug ?? "" }}>
                    Start
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No problems available yet.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={Flame} label="Day streak" value={String(streak)} />
              <Stat icon={Target} label="Submissions" value={String(submissions.length)} />
              <Stat icon={Trophy} label="Acceptance" value={`${acceptance}%`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-display text-base">
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
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...unlocked.slice(-3).reverse(), ...nextUp(badges, 3)]
            .slice(0, 3)
            .map((badge) => (
              <BadgeCard key={badge.id} badge={badge} compact />
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Submission heatmap</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <SubmissionHeatmap counts={counts} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Recent submissions</CardTitle>
            <CardDescription>Your latest judged attempts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissions.slice(0, 10).map((s) => {
              const problem = problemTitle(s.problem_id);
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
                  </span>
                </div>
              );
            })}
            {submissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No submissions yet — start with the daily challenge.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Topic mastery</CardTitle>
            <CardDescription>Solved share per topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {byTopic.map((row) => (
              <div key={row.topic} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{row.topic}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.solved}/{row.total}
                  </span>
                </div>
                <Progress value={row.total ? (row.solved / row.total) * 100 : 0} className="h-1.5" />
              </div>
            ))}
            {byTopic.length === 0 && <p className="text-sm text-muted-foreground">No topics yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Continue solving</CardTitle>
          <CardDescription>Picked from what you have not solved yet</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {continueList.map((p) => (
            <Link
              key={p.id}
              to="/problems/$slug"
              params={{ slug: p.slug ?? "" }}
              className="rounded-md border p-3 transition-colors hover:bg-muted/50"
            >
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs">
                <span className={`capitalize font-medium ${LEVEL_TONE[p.level]}`}>{p.level}</span>
                <span className="capitalize text-muted-foreground">{p.status}</span>
              </p>
            </Link>
          ))}
          {continueList.length === 0 && (
            <p className="text-sm text-muted-foreground">Everything solved — nice work.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Training snapshot</CardTitle>
          <CardDescription>Your CRT programme at a glance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6 text-sm">
          <span>
            Average score <strong className="tabular-nums">{avgScore}%</strong>
          </span>
          <span>
            Assessments taken <strong className="tabular-nums">{myScores.length}</strong>
          </span>
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            {nextAssessment
              ? `${nextAssessment.title} · ${nextAssessment.scheduled_on}`
              : "Nothing scheduled"}
          </span>
          <Button asChild size="sm" variant="ghost" className="ml-auto">
            <Link to="/assessments">View assessments</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <Icon className="size-5 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
