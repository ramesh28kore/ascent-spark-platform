import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAnalytics } from "@/lib/exams.functions";
import { ExportCentre } from "@/components/ExportCentre";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CRT Training Console" },
      {
        name: "description",
        content:
          "Score distribution, weakest modules, judge activity heatmap and proctoring flags across the CRT batch.",
      },
      { property: "og:title", content: "Analytics — CRT Training Console" },
      {
        property: "og:description",
        content: "Batch-wide CRT performance analytics and weak-topic detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function heatClass(count: number) {
  if (count === 0) return "bg-muted";
  if (count < 3) return "bg-primary/25";
  if (count < 6) return "bg-primary/50";
  if (count < 12) return "bg-primary/75";
  return "bg-primary";
}

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getAnalytics);
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: () => fetchAnalytics() });
  const data = analytics.data;

  const stats = [
    { label: "Attempts submitted", value: data?.totals.attempts ?? 0 },
    { label: "Code submissions", value: data?.totals.submissions ?? 0 },
    { label: "Accepted solutions", value: data?.totals.accepted ?? 0 },
    {
      label: "Attendance",
      value: data?.totals.attendancePercent === null ? "—" : `${data?.totals.attendancePercent}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Where the batch is losing marks, and how much judging activity is happening.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <ExportCentre />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score distribution</CardTitle>
            <CardDescription>Submitted online-test attempts by score band.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.distribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="band" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weakest modules</CardTitle>
            <CardDescription>Lowest attainment first — target revision here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data?.moduleAttainment ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough graded work yet to rank modules.
              </p>
            ) : null}
            {(data?.moduleAttainment ?? []).slice(0, 8).map((module) => (
              <div key={module.module_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    <span className="font-medium">{module.code}</span> · {module.title}
                  </span>
                  <Badge variant={(module.percent ?? 0) < 50 ? "destructive" : "secondary"}>
                    {module.percent}%
                  </Badge>
                </div>
                <Progress value={module.percent ?? 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Judge activity</CardTitle>
          <CardDescription>
            Code submissions per day. {data?.totals.sandboxJudged ?? 0} judged in the sandbox ·{" "}
            {data?.totals.flaggedAttempts ?? 0} attempts flagged by proctoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.activity ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(data?.activity ?? []).map((day) => (
                <div
                  key={day.day}
                  title={`${day.day}: ${day.count} submission(s)`}
                  className={`size-4 rounded-sm ${heatClass(day.count)}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
