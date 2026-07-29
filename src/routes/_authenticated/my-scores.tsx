import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  assessmentsQuery,
  meQuery,
  modulesQuery,
  scoresQuery,
  KIND_LABEL,
  pct,
} from "@/lib/crt-queries";
import {
  buildStudentReport,
  downloadText,
  reportToCsv,
  reportToPdf,
  type StudentRow,
} from "@/lib/crt-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/my-scores")({
  head: () => ({
    meta: [
      { title: "My scores — CRT Training Console" },
      {
        name: "description",
        content: "Your CRT assessment history, attempts and percentage trend over the programme.",
      },
      { property: "og:title", content: "My scores — CRT Training Console" },
      { property: "og:description", content: "Track your own placement-readiness trend." },
    ],
  }),
  component: MyScores,
});

function MyScores() {
  const me = useQuery(meQuery);
  const assessments = useQuery(assessmentsQuery);
  const scores = useQuery(scoresQuery);
  const modules = useQuery(modulesQuery);

  if (me.isLoading || scores.isLoading) return <Skeleton className="h-96 w-full" />;

  const profile = me.data?.profile as StudentRow | null | undefined;
  const profileId = profile?.id;
  const list = assessments.data ?? [];
  const mine = (scores.data ?? []).filter((s) => s.student_id === profileId);

  const rows = mine
    .map((s) => {
      const a = list.find((x) => x.id === s.assessment_id);
      return {
        id: s.id,
        title: a?.title ?? "Assessment",
        kind: a ? KIND_LABEL[a.kind] : "—",
        date: a?.scheduled_on ?? "",
        marks: Number(s.marks),
        max: a?.max_marks ?? 0,
        percent: a ? pct(Number(s.marks), a.max_marks) : 0,
        attempts: s.attempts,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
    : 0;

  const report = profile
    ? buildStudentReport(profile, modules.data?.modules ?? [], list, scores.data ?? [])
    : null;

  function exportPdf() {
    if (!report) return;
    reportToPdf(report);
    toast.success("PDF report downloaded");
  }

  function exportCsv() {
    if (!report) return;
    downloadText("crt-my-report.csv", reportToCsv(report), "text/csv");
    toast.success("CSV report downloaded");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">My scores</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} assessments recorded · {avg}% average
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportPdf} disabled={!report}>
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!report}>
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Progress trend</CardTitle>
          <CardDescription>Percentage per assessment, in date order</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line dataKey="percent" stroke="var(--chart-1)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Assessment history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.kind}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="text-right">
                      {r.marks}/{r.max}
                    </TableCell>
                    <TableCell className="text-right">{r.attempts}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.percent >= 50 ? "default" : "destructive"}>
                        {r.percent}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No scores recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Course outcome attainment</CardTitle>
              <CardDescription>
                Level 3 = 70%+, 2 = 60–69%, 1 = 50–59%, 0 = below target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.coRows.map((c) => (
                <div key={c.co}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {c.co} · {c.moduleTitle}
                    </span>
                    <span className="text-muted-foreground">
                      {c.tests ? `${c.percent}% · L${c.level}` : "Not assessed"}
                    </span>
                  </div>
                  <Progress value={c.percent} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Programme outcome (PO / PSO) mapping
              </CardTitle>
              <CardDescription>Correlation-weighted from mapped course outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {report.poRows.map((p) => (
                  <Badge
                    key={p.po}
                    variant={p.level >= 2 ? "default" : p.level === 1 ? "secondary" : "destructive"}
                    className="gap-1"
                  >
                    {p.po} · {p.percent}% · L{p.level}
                  </Badge>
                ))}
                {report.poRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No attainment yet — take an assessment first.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
