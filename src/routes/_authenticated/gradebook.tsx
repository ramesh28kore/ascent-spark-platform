import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { getGradebookData } from "@/lib/gradebook.functions";
import {
  applyFilters,
  buildMarksReport,
  buildMatrixReport,
  indexSubmissions,
  summarise,
  type GradebookFilters,
} from "@/lib/gradebook";
import { exportReport, type ExportFormat } from "@/lib/export-formats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/gradebook")({
  head: () => ({
    meta: [
      { title: "Practice gradebook — CRT Training Console" },
      {
        name: "description",
        content:
          "Per-student, per-problem coding practice grading with downloadable matrix and marks sheets.",
      },
      { property: "og:title", content: "Practice gradebook — CRT Training Console" },
      {
        property: "og:description",
        content: "Trainer gradebook for coding practice with PDF, Excel and CSV downloads.",
      },
    ],
  }),
  component: GradebookPage,
});

function GradebookPage() {
  const load = useServerFn(getGradebookData);
  const data = useQuery({ queryKey: ["gradebook"], queryFn: () => load() });

  const [filters, setFilters] = useState<GradebookFilters>({
    batchId: "all",
    moduleId: "all",
    from: "",
    to: "",
  });

  const view = useMemo(
    () => (data.data ? applyFilters(data.data, filters) : null),
    [data.data, filters],
  );
  const index = useMemo(() => indexSubmissions(view?.submissions ?? []), [view]);

  const download = (kind: "matrix" | "marks", format: ExportFormat) => {
    if (!data.data) return;
    const doc =
      kind === "matrix"
        ? buildMatrixReport(data.data, filters)
        : buildMarksReport(data.data, filters);
    exportReport(doc, format);
    toast.success(`${kind === "matrix" ? "Matrix" : "Marks sheet"} downloaded`);
  };

  if (data.isPending) return <Skeleton className="h-[70vh] w-full" />;
  if (data.isError)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {(data.error as Error).message}
        </CardContent>
      </Card>
    );

  const problems = view?.problems ?? [];
  const students = view?.students ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Practice gradebook</h1>
        <p className="text-sm text-muted-foreground">
          Auto-graded from accepted submissions on published problems.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & downloads</CardTitle>
          <CardDescription>Choose a cohort, then export the grading sheets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <Select
                value={filters.batchId}
                onValueChange={(v) => setFilters((f) => ({ ...f, batchId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {(data.data?.batches ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select
                value={filters.moduleId}
                onValueChange={(v) => setFilters((f) => ({ ...f, moduleId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {(data.data?.modules ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["pdf", "excel", "csv"] as ExportFormat[]).map((f) => (
              <Button
                key={`matrix-${f}`}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => download("matrix", f)}
              >
                <Download className="size-4" /> Matrix {f.toUpperCase()}
              </Button>
            ))}
            {(["pdf", "excel", "csv"] as ExportFormat[]).map((f) => (
              <Button
                key={`marks-${f}`}
                size="sm"
                className="gap-2"
                onClick={() => download("marks", f)}
              >
                <Download className="size-4" /> Marks {f.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {students.length} students · {problems.length} published problems
          </CardTitle>
          <CardDescription>Green means solved, amber means attempted.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Student</TableHead>
                <TableHead>Solved</TableHead>
                {problems.map((p) => (
                  <TableHead key={p.id} className="whitespace-nowrap text-xs">
                    {p.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const cells = problems.map((p) =>
                  summarise(index.get(`${s.id}::${p.id}`) ?? [], p),
                );
                const solved = cells.filter((c) => c.status === "solved").length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="sticky left-0 bg-background whitespace-nowrap">
                      <span className="font-medium">{s.full_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.roll_number ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {solved}/{problems.length}
                    </TableCell>
                    {cells.map((c, i) => (
                      <TableCell key={i}>
                        {c.status === "solved" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600" variant="secondary">
                            {c.attempts}
                          </Badge>
                        ) : c.status === "attempted" ? (
                          <Badge className="bg-amber-500/15 text-amber-600" variant="secondary">
                            {c.attempts}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + problems.length} className="text-sm text-muted-foreground">
                    No students match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
