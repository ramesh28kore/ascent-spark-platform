import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createAssessment, saveScore } from "@/lib/crt.functions";
import {
  assessmentsQuery,
  meQuery,
  modulesQuery,
  scoresQuery,
  studentsQuery,
  KIND_LABEL,
  pct,
} from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — CRT Training Console" },
      {
        name: "description",
        content: "Schedule weekly tests, mock NQT papers and coding tests, then record student marks.",
      },
      { property: "og:title", content: "Assessments — CRT Training Console" },
      { property: "og:description", content: "Schedule CRT tests and capture scores." },
    ],
  }),
  component: AssessmentsPage,
});

const KINDS = ["weekly_test", "mock_nqt", "coding_test", "interview"] as const;

function AssessmentsPage() {
  const me = useQuery(meQuery);
  const assessments = useQuery(assessmentsQuery);
  const modules = useQuery(modulesQuery);
  const students = useQuery(studentsQuery);
  const scores = useQuery(scoresQuery);
  const queryClient = useQueryClient();

  const addAssessment = useServerFn(createAssessment);
  const putScore = useServerFn(saveScore);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("weekly_test");
  const [moduleId, setModuleId] = useState("none");
  const [maxMarks, setMaxMarks] = useState("100");
  const [scheduledOn, setScheduledOn] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: () =>
      addAssessment({
        data: {
          title: title.trim(),
          kind,
          module_id: moduleId === "none" ? null : moduleId,
          max_marks: Number(maxMarks),
          scheduled_on: scheduledOn,
        },
      }),
    onSuccess: () => {
      toast.success("Assessment scheduled");
      setOpen(false);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scoreMutation = useMutation({
    mutationFn: (vars: { student_id: string; assessment_id: string; marks: number }) =>
      putScore({ data: { ...vars, attempts: 1 } }),
    onSuccess: () => {
      toast.success("Score saved");
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (assessments.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!me.data?.isTrainer) {
    return (
      <StudentAssessments
        assessments={assessments.data ?? []}
        scores={scores.data ?? []}
        myProfileId={me.data?.profile?.id ?? null}
      />
    );
  }


  const list = assessments.data ?? [];
  const active = list.find((a) => a.id === selected) ?? list[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            Weekly tests, mock NQT papers, coding tests and mock interviews.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">New assessment</DialogTitle>
              <DialogDescription>Add it to the batch calendar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="t">Title</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Module</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(modules.data?.modules ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} · {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mm">Max marks</Label>
                  <Input
                    id="mm"
                    type="number"
                    min={1}
                    max={500}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d">Date</Label>
                  <Input
                    id="d"
                    type="date"
                    value={scheduledOn}
                    onChange={(e) => setScheduledOn(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (title.trim().length < 3) return toast.error("Title is too short");
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
              >
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display text-base">Calendar</CardTitle>
            <CardDescription>{list.length} scheduled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent/40 ${
                  active?.id === a.id ? "border-primary bg-accent/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline">{KIND_LABEL[a.kind]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.scheduled_on} · {a.max_marks} marks
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">
              {active ? `Marks — ${active.title}` : "Marks"}
            </CardTitle>
            <CardDescription>
              {active ? `Out of ${active.max_marks}. Entries save on blur.` : "Select an assessment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {active && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead className="w-32">Marks</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(students.data ?? []).map((p) => {
                      const existing = (scores.data ?? []).find(
                        (s) => s.student_id === p.id && s.assessment_id === active.id,
                      );
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell>{p.roll_number ?? "—"}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={active.max_marks}
                              defaultValue={existing ? String(existing.marks) : ""}
                              key={`${active.id}-${p.id}`}
                              onBlur={(e) => {
                                const value = Number(e.target.value);
                                if (e.target.value === "" || Number.isNaN(value)) return;
                                if (value < 0 || value > active.max_marks) {
                                  return toast.error(`Marks must be 0–${active.max_marks}`);
                                }
                                if (existing && Number(existing.marks) === value) return;
                                scoreMutation.mutate({
                                  student_id: p.id,
                                  assessment_id: active.id,
                                  marks: value,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {existing ? `${pct(Number(existing.marks), active.max_marks)}%` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AssessmentRow = {
  id: string;
  title: string;
  kind: string;
  max_marks: number;
  scheduled_on: string;
};
type ScoreRow = { student_id: string; assessment_id: string; marks: number };

function StudentAssessments({
  assessments,
  scores,
  myProfileId,
}: {
  assessments: AssessmentRow[];
  scores: ScoreRow[];
  myProfileId: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = assessments
    .filter((a) => a.scheduled_on >= today)
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on));
  const past = assessments
    .filter((a) => a.scheduled_on < today)
    .sort((a, b) => b.scheduled_on.localeCompare(a.scheduled_on));
  const myScore = (id: string) =>
    scores.find((s) => s.assessment_id === id && s.student_id === myProfileId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Your scheduled tests, mock papers and interviews, with marks once released.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Upcoming</CardTitle>
          <CardDescription>{upcoming.length} scheduled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing scheduled right now.</p>
          )}
          {upcoming.map((a) => (
            <div key={a.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{a.title}</span>
                <Badge variant="outline">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.scheduled_on} · {a.max_marks} marks
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Completed</CardTitle>
          <CardDescription>Marks appear once your trainer records them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No completed assessments yet.
                    </TableCell>
                  </TableRow>
                )}
                {past.map((a) => {
                  const s = myScore(a.id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.scheduled_on}</TableCell>
                      <TableCell>{KIND_LABEL[a.kind] ?? a.kind}</TableCell>
                      <TableCell className="text-right">
                        {s ? `${s.marks} / ${a.max_marks}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s ? `${pct(Number(s.marks), a.max_marks)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
