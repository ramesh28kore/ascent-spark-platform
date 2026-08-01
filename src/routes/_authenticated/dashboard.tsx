import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CalendarClock, Percent, Users } from "lucide-react";

import { StudentHome } from "@/components/StudentHome";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  assessmentsQuery,
  meQuery,
  modulesQuery,
  scoresQuery,
  studentsQuery,
  KIND_LABEL,
  pct,
} from "@/lib/crt-queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CRT Training Console" },
      {
        name: "description",
        content:
          "Coding progress, daily challenge and submission streak for students; batch performance for trainers.",
      },
      { property: "og:title", content: "Dashboard — CRT Training Console" },
      {
        property: "og:description",
        content: "Solved problems, streaks and batch performance at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = useQuery(meQuery);
  if (me.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!me.data?.isTrainer) return <StudentHome />;
  return <TrainerDashboard />;
}

function TrainerDashboard() {
  const me = useQuery(meQuery);
  const modules = useQuery(modulesQuery);
  const students = useQuery(studentsQuery);
  const assessments = useQuery(assessmentsQuery);
  const scores = useQuery(scoresQuery);

  if (me.isLoading || modules.isLoading || scores.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const isTrainer = me.data?.isTrainer ?? false;

  const myProfileId = me.data?.profile?.id;
  const allScores = scores.data ?? [];
  const list = assessments.data ?? [];
  const mods = modules.data?.modules ?? [];
  const topics = modules.data?.topics ?? [];

  const relevant = isTrainer ? allScores : allScores.filter((s) => s.student_id === myProfileId);

  const byAssessment = list.map((a) => {
    const rows = relevant.filter((s) => s.assessment_id === a.id);
    const avg = rows.length ? rows.reduce((sum, r) => sum + Number(r.marks), 0) / rows.length : 0;
    return {
      name: a.title.length > 22 ? `${a.title.slice(0, 22)}…` : a.title,
      percent: pct(avg, a.max_marks),
      date: a.scheduled_on,
    };
  });

  const overallPercent = byAssessment.length
    ? Math.round(byAssessment.reduce((s, r) => s + r.percent, 0) / byAssessment.length)
    : 0;

  const passRate = (() => {
    const rows = relevant.map((s) => {
      const a = list.find((x) => x.id === s.assessment_id);
      return a ? pct(Number(s.marks), a.max_marks) : 0;
    });
    if (!rows.length) return 0;
    return Math.round((rows.filter((p) => p >= 50).length / rows.length) * 100);
  })();

  const studentAverages = (students.data ?? [])
    .filter((p) => !p.user_id || p.id === myProfileId)
    .map((p) => {
      const rows = allScores.filter((s) => s.student_id === p.id);
      const avg = rows.length
        ? Math.round(
            rows.reduce((sum, r) => {
              const a = list.find((x) => x.id === r.assessment_id);
              return sum + (a ? pct(Number(r.marks), a.max_marks) : 0);
            }, 0) / rows.length,
          )
        : 0;
      return { id: p.id, name: p.full_name, roll: p.roll_number, avg };
    })
    .sort((a, b) => a.avg - b.avg);

  const bottomQuartile = studentAverages.slice(
    0,
    Math.max(1, Math.ceil(studentAverages.length / 4)),
  );

  const upcoming = list
    .filter((a) => new Date(a.scheduled_on) >= new Date(Date.now() - 86400000))
    .slice(0, 4);

  const moduleProgress = mods.map((m) => {
    const t = topics.filter((x) => x.module_id === m.id);
    const done = t.filter((x) => x.completed).length;
    return { code: m.code, title: m.title, done, total: t.length, hours: m.hours };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isTrainer ? "Batch overview" : `Hello, ${me.data?.profile?.full_name ?? "student"}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTrainer
            ? "Performance, coverage and upcoming assessments across the CRT batch."
            : "Your progress across the CRT programme."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Percent} label="Average score" value={`${overallPercent}%`} />
        <StatCard icon={Percent} label="Pass rate (≥50%)" value={`${passRate}%`} />
        <StatCard
          icon={Users}
          label={isTrainer ? "Students tracked" : "Assessments taken"}
          value={String(isTrainer ? studentAverages.length : relevant.length)}
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming assessments"
          value={String(upcoming.length)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Average score by assessment</CardTitle>
            <CardDescription>Percentage of maximum marks</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {isTrainer ? (
                <BarChart data={byAssessment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={8} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="percent" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={byAssessment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={8} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line dataKey="percent" stroke="var(--chart-1)" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Module coverage</CardTitle>
            <CardDescription>Topics completed per module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {moduleProgress.map((m) => (
              <div key={m.code}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {m.code} · {m.title}
                  </span>
                  <span className="text-muted-foreground">
                    {m.done}/{m.total}
                  </span>
                </div>
                <Progress value={m.total ? (m.done / m.total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">
              {isTrainer ? "Remedial watchlist" : "Weakest areas"}
            </CardTitle>
            <CardDescription>
              {isTrainer
                ? "Bottom quartile — reinforce M1–M2 in parallel"
                : "Assessments where you scored below 50%"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isTrainer
              ? bottomQuartile.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-accent" />
                      {s.name}
                      <span className="text-xs text-muted-foreground">{s.roll}</span>
                    </span>
                    <Badge variant="secondary">{s.avg}%</Badge>
                  </div>
                ))
              : byAssessment
                  .filter((a) => a.percent < 50)
                  .map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{a.name}</span>
                      <Badge variant="secondary">{a.percent}%</Badge>
                    </div>
                  ))}
            {!isTrainer && byAssessment.every((a) => a.percent >= 50) && (
              <p className="text-sm text-muted-foreground">No weak areas — keep going.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Upcoming assessments</CardTitle>
            <CardDescription>Next in the calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            )}
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{a.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{KIND_LABEL[a.kind]}</Badge>
                  {a.scheduled_on}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
