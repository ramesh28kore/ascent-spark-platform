import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  assessmentsQuery,
  scoresQuery,
  studentsQuery,
  meQuery,
  modulesQuery,
  attendanceQuery,
  testsQuery,
  practiceQuery,
  mocksQuery,
  pct,
} from "@/lib/crt-queries";
import { computeReadiness } from "@/lib/readiness-agg";
import { bandVariant } from "@/lib/readiness";

import {
  batchToCsv,
  buildStudentReport,
  downloadText,
  reportToCsv,
  reportToPdf,
  type StudentRow,
} from "@/lib/crt-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students — CRT Training Console" },
      {
        name: "description",
        content: "Student performance tracker: averages, attempts and per-assessment scores.",
      },
      { property: "og:title", content: "Students — CRT Training Console" },
      { property: "og:description", content: "Track every trainee's CRT performance." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const me = useQuery(meQuery);
  const students = useQuery(studentsQuery);
  const assessments = useQuery(assessmentsQuery);
  const scores = useQuery(scoresQuery);
  const modules = useQuery(modulesQuery);
  const attendance = useQuery(attendanceQuery);
  const tests = useQuery(testsQuery);
  const practice = useQuery(practiceQuery);
  const mocks = useQuery(mocksQuery);
  const [search, setSearch] = useState("");

  const readinessMap = useMemo(() => {
    const coreModuleIds = (modules.data?.modules ?? [])
      .filter((m) => ["M4", "M04"].includes(m.code.toUpperCase()))
      .map((m) => m.id);
    const list = computeReadiness({
      students: students.data ?? [],
      attendance: attendance.data ?? [],
      attempts: tests.data?.attempts ?? [],
      practiceProblems: practice.data?.problems ?? [],
      practiceProgress: practice.data?.progress ?? [],
      mocks: mocks.data ?? [],
      scores: scores.data ?? [],
      assessments: assessments.data ?? [],
      coreModuleIds,
    });
    return new Map(list.map((r) => [r.student_id, r]));
  }, [
    students.data,
    attendance.data,
    tests.data,
    practice.data,
    mocks.data,
    scores.data,
    assessments.data,
    modules.data,
  ]);

  const rows = useMemo(() => {
    const list = assessments.data ?? [];
    return (students.data ?? [])
      .map((p) => {
        const mine = (scores.data ?? []).filter((s) => s.student_id === p.id);
        const percents = mine.map((s) => {
          const a = list.find((x) => x.id === s.assessment_id);
          return a ? pct(Number(s.marks), a.max_marks) : 0;
        });
        const avg = percents.length
          ? Math.round(percents.reduce((x, y) => x + y, 0) / percents.length)
          : 0;
        const readiness = readinessMap.get(p.id);
        return {
          ...p,
          taken: mine.length,
          attempts: mine.reduce((s, r) => s + r.attempts, 0),
          avg,
          attendancePct: readiness?.attendancePct ?? 0,
          readiness: readiness?.score ?? 0,
          band: readiness?.band ?? "Needs Work",
        };
      })
      .filter((p) =>
        `${p.full_name} ${p.roll_number ?? ""} ${p.branch ?? ""} ${p.batch ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .sort((a, b) => b.avg - a.avg);
  }, [students.data, scores.data, assessments.data, readinessMap, search]);

  function reportFor(student: StudentRow) {
    return buildStudentReport(
      student,
      modules.data?.modules ?? [],
      assessments.data ?? [],
      scores.data ?? [],
    );
  }

  function exportPdf(student: StudentRow) {
    reportToPdf(reportFor(student));
    toast.success(`PDF report generated for ${student.full_name}`);
  }

  function exportCsv(student: StudentRow) {
    const report = reportFor(student);
    const slug = (student.roll_number || student.full_name)
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
    downloadText(`crt-report-${slug}.csv`, reportToCsv(report), "text/csv");
    toast.success(`CSV report generated for ${student.full_name}`);
  }

  function exportBatch() {
    if (!rows.length) return toast.error("No students to export");
    const reports = rows.map((r) => reportFor(r));
    downloadText("crt-batch-attainment.csv", batchToCsv(reports), "text/csv");
    toast.success(`Batch CSV exported for ${reports.length} students`);
  }

  if (students.isLoading) return <Skeleton className="h-96 w-full" />;

  if (!me.data?.isTrainer) {
    return <p className="text-sm text-muted-foreground">Trainer access only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Student performance</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by average percentage across all recorded assessments.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportBatch}>
          <FileDown className="h-4 w-4" /> Export batch CO/PO CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="font-display text-base">Batch roster</CardTitle>
            <CardDescription>
              {rows.length} students · export any student's full report with scores, attempt history
              and CO/PO attainment
            </CardDescription>
          </div>
          <Input
            placeholder="Search name, roll number, branch or batch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={60}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Tests</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Readiness</TableHead>

                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.roll_number ?? "—"}</TableCell>
                    <TableCell>{r.branch ?? "—"}</TableCell>
                    <TableCell>{r.batch ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.taken}</TableCell>
                    <TableCell className="text-right">{r.attempts}</TableCell>
                    <TableCell className="text-right font-semibold">{r.avg}%</TableCell>
                    <TableCell className="text-right tabular-nums">{r.attendancePct}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={bandVariant(r.band)}>
                        {r.readiness} · {r.band}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge
                        variant={
                          r.avg >= 70 ? "default" : r.avg >= 50 ? "secondary" : "destructive"
                        }
                      >
                        {r.avg >= 70 ? "Placement ready" : r.avg >= 50 ? "On track" : "Remedial"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => exportPdf(r)}
                          aria-label={`Download PDF report for ${r.full_name}`}
                        >
                          <FileText className="h-4 w-4" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => exportCsv(r)}
                          aria-label={`Download CSV report for ${r.full_name}`}
                        >
                          <FileSpreadsheet className="h-4 w-4" /> CSV
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
