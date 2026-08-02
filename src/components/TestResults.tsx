/**
 * Trainer-facing marks sheet for a single online test, with PDF / Excel / CSV
 * download. Only rendered for staff — the server function also re-checks.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { getTestResults } from "@/lib/tests.functions";
import { exportReport, type ExportFormat } from "@/lib/export-formats";
import type { ReportDoc } from "@/lib/report-builders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResultRow = {
  student_id: string;
  full_name: string;
  roll_number: string;
  email: string;
  branch: string;
  batch: string;
  score: number;
  max_score: number;
  correct: number;
  attempted: number;
  total_questions: number;
  blur_count: number;
  seconds: number | null;
  submitted_at: string | null;
  started_at: string | null;
};

const pct = (score: number, max: number) => (max > 0 ? Math.round((score / max) * 100) : 0);

const mmss = (seconds: number | null) =>
  seconds === null
    ? "—"
    : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function buildMarksSheet(
  testTitle: string,
  totalMarks: number,
  rows: ResultRow[],
): ReportDoc {
  const submitted = rows.filter((r) => r.submitted_at);
  const average = submitted.length
    ? Math.round(submitted.reduce((sum, r) => sum + pct(r.score, r.max_score), 0) / submitted.length)
    : 0;
  const top = submitted.reduce((best, r) => Math.max(best, pct(r.score, r.max_score)), 0);
  const passed = submitted.filter((r) => pct(r.score, r.max_score) >= 40).length;

  return {
    slug: "mcq-marks-sheet",
    title: `Marks sheet — ${testTitle}`,
    subtitle: `${submitted.length} submissions · ${totalMarks} marks paper`,
    generatedAt: new Date().toLocaleString(),
    filters: [`Test: ${testTitle}`, `Paper total: ${totalMarks}`],
    summary: [
      { label: "Submitted", value: String(submitted.length) },
      { label: "Average %", value: `${average}%` },
      { label: "Highest %", value: `${top}%` },
      { label: "Pass (>=40%)", value: String(passed) },
    ],
    sections: [
      {
        name: "Student results",
        columns: [
          "Roll number",
          "Student",
          "Batch",
          "Score",
          "Out of",
          "%",
          "Correct",
          "Attempted",
          "Questions",
          "Time taken",
          "Tab switches",
          "Submitted at",
        ],
        rows: rows.map((r) => [
          r.roll_number || "—",
          r.full_name,
          r.batch || "—",
          r.score,
          r.max_score,
          `${pct(r.score, r.max_score)}%`,
          r.correct,
          r.attempted,
          r.total_questions,
          mmss(r.seconds),
          r.blur_count,
          r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "Not submitted",
        ]),
        note: "Auto-graded by the exam engine on submission.",
      },
    ],
  };
}

export function TestResults({ testId }: { testId: string }) {
  const fetchResults = useServerFn(getTestResults);
  const results = useQuery({
    queryKey: ["test-results", testId],
    queryFn: () => fetchResults({ data: { test_id: testId } }),
  });

  if (results.isLoading) return <Skeleton className="h-56 w-full" />;
  if (results.isError)
    return (
      <p className="text-sm text-destructive">
        {(results.error as Error).message || "Unable to load the marks sheet."}
      </p>
    );

  const rows = (results.data?.rows ?? []) as ResultRow[];
  const totalMarks = results.data?.totalMarks ?? 0;
  const title = String(results.data?.test?.title ?? "Test");

  const download = (format: ExportFormat) => {
    if (!rows.length) return toast.error("No submissions to export yet.");
    const file = exportReport(buildMarksSheet(title, totalMarks, rows), format, title);
    toast.success(`Downloaded ${file}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Marks sheet</CardTitle>
          <CardDescription>
            {rows.filter((r) => r.submitted_at).length} submitted · paper total {totalMarks} marks
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["pdf", "xlsx", "csv"] as ExportFormat[]).map((f) => (
            <Button key={f} size="sm" variant="outline" className="gap-1.5" onClick={() => download(f)}>
              <Download className="h-3.5 w-3.5" /> {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Correct</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Tab switches</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell className="font-mono text-xs">{r.roll_number || "—"}</TableCell>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell className="text-right">
                  {r.score} / {r.max_score}
                </TableCell>
                <TableCell className="text-right">{pct(r.score, r.max_score)}%</TableCell>
                <TableCell className="text-right">
                  {r.correct} / {r.total_questions}
                </TableCell>
                <TableCell className="text-right">{mmss(r.seconds)}</TableCell>
                <TableCell className="text-right">
                  {r.blur_count > 0 ? (
                    <Badge variant="destructive">{r.blur_count}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "In progress"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  No attempts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
