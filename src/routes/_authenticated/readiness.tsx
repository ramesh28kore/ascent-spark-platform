import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Plus } from "lucide-react";

import { addMockInterview } from "@/lib/crt-ops.functions";
import {
  assessmentsQuery,
  attendanceQuery,
  meQuery,
  mocksQuery,
  modulesQuery,
  practiceQuery,
  scoresQuery,
  studentsQuery,
  testsQuery,
} from "@/lib/crt-queries";
import { computeReadiness } from "@/lib/readiness-agg";
import { READINESS_WEIGHTS, bandVariant } from "@/lib/readiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/readiness")({
  head: () => ({
    meta: [
      { title: "Placement readiness — CRT Training Console" },
      {
        name: "description",
        content:
          "Composite placement-readiness index combining attendance, tests, coding practice, mock interviews and core subjects.",
      },
      { property: "og:title", content: "Placement readiness — CRT Training Console" },
      {
        property: "og:description",
        content: "Ready / Near-Ready / Needs Work bands for every CRT student.",
      },
    ],
  }),
  component: ReadinessPage,
});

function ReadinessPage() {
  const me = useQuery(meQuery);
  const students = useQuery(studentsQuery);
  const attendance = useQuery(attendanceQuery);
  const tests = useQuery(testsQuery);
  const practice = useQuery(practiceQuery);
  const mocks = useQuery(mocksQuery);
  const scores = useQuery(scoresQuery);
  const assessments = useQuery(assessmentsQuery);
  const modules = useQuery(modulesQuery);
  const queryClient = useQueryClient();
  const addMock = useServerFn(addMockInterview);

  const isStaff = !!me.data?.isStaff;
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [rating, setRating] = useState("70");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");

  const coreModuleIds = (modules.data?.modules ?? [])
    .filter((m) => ["M4", "M04"].includes(m.code.toUpperCase()))
    .map((m) => m.id);

  const rows = useMemo(
    () =>
      computeReadiness({
        students: students.data ?? [],
        attendance: attendance.data ?? [],
        attempts: tests.data?.attempts ?? [],
        practiceProblems: practice.data?.problems ?? [],
        practiceProgress: practice.data?.progress ?? [],
        mocks: mocks.data ?? [],
        scores: scores.data ?? [],
        assessments: assessments.data ?? [],
        coreModuleIds,
      }).sort((a, b) => b.score - a.score),
    [
      students.data,
      attendance.data,
      tests.data,
      practice.data,
      mocks.data,
      scores.data,
      assessments.data,
      coreModuleIds.join(","),
    ],
  );

  const counts = {
    Ready: rows.filter((r) => r.band === "Ready").length,
    "Near-Ready": rows.filter((r) => r.band === "Near-Ready").length,
    "Needs Work": rows.filter((r) => r.band === "Needs Work").length,
  };

  const saveMock = useMutation({
    mutationFn: () =>
      addMock({
        data: {
          student_id: studentId,
          rating: Number(rating) || 0,
          interviewer: interviewer.trim() || null,
          notes: notes.trim() || null,
          held_on: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: () => {
      toast.success("Mock interview recorded");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["mock-interviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const header = [
      "Student",
      "Batch",
      "Attendance %",
      "Test avg %",
      "Coding %",
      "Mock %",
      "Core %",
      "Readiness",
      "Band",
    ];
    const body = rows.map((r) => [
      r.full_name,
      r.batch ?? "",
      r.attendancePct,
      r.testAvg,
      r.codingScore,
      r.mockRating,
      r.coreAvg,
      r.score,
      r.band,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "crt-readiness.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Placement readiness</h1>
          <p className="text-sm text-muted-foreground">
            {READINESS_WEIGHTS.map((w) => `${w.label} ${Math.round(w.weight * 100)}%`).join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={exportCsv}>
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          {isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Mock interview
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record mock interview</DialogTitle>
                  <DialogDescription>Rating feeds 15% of the readiness index.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Student</Label>
                    <Select value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {(students.data ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rating (0-100)</Label>
                    <Input type="number" value={rating} onChange={(e) => setRating(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Interviewer</Label>
                    <Input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Feedback</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => saveMock.mutate()} disabled={!studentId || saveMock.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["Ready", "Near-Ready", "Needs Work"] as const).map((band) => (
          <Card key={band}>
            <CardHeader className="pb-2">
              <CardDescription>{band}</CardDescription>
              <CardTitle className="font-display text-3xl">{counts[band]}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {band === "Ready"
                ? "Index 75 and above"
                : band === "Near-Ready"
                  ? "Index 55 – 74"
                  : "Index below 55"}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Readiness board</CardTitle>
          <CardDescription>Weighted composite across all five pillars.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Attend</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Coding</TableHead>
                <TableHead>Mock</TableHead>
                <TableHead>Core</TableHead>
                <TableHead className="w-[180px]">Index</TableHead>
                <TableHead>Band</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.student_id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.batch ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{r.attendancePct}%</TableCell>
                  <TableCell className="tabular-nums">{r.testAvg}%</TableCell>
                  <TableCell className="tabular-nums">{r.codingScore}%</TableCell>
                  <TableCell className="tabular-nums">{r.mockRating}%</TableCell>
                  <TableCell className="tabular-nums">{r.coreAvg}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.score} className="h-2" />
                      <span className="w-12 text-right text-xs tabular-nums">{r.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bandVariant(r.band)}>{r.band}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
