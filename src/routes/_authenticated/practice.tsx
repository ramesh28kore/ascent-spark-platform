import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";

import { createPracticeProblem, setPracticeStatus } from "@/lib/crt-ops.functions";
import { meQuery, modulesQuery, practiceQuery, studentsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice ladder — CRT Training Console" },
      {
        name: "description",
        content:
          "Difficulty-graded coding practice ladder with per-student solved tracking feeding the readiness index.",
      },
      { property: "og:title", content: "Practice ladder — CRT Training Console" },
      { property: "og:description", content: "Track easy to hard coding practice progress." },
    ],
  }),
  component: PracticePage,
});

const STATUSES = ["todo", "attempted", "solved"] as const;

function PracticePage() {
  const me = useQuery(meQuery);
  const practice = useQuery(practiceQuery);
  const modules = useQuery(modulesQuery);
  const students = useQuery(studentsQuery);
  const queryClient = useQueryClient();
  const addProblem = useServerFn(createPracticeProblem);
  const setStatus = useServerFn(setPracticeStatus);

  const isStaff = !!me.data?.isStaff;
  const myProfileId = me.data?.profile?.id ?? null;
  const [viewStudent, setViewStudent] = useState<string>("");
  const activeStudent = isStaff ? viewStudent : (myProfileId ?? "");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("internal");
  const [url, setUrl] = useState("");
  const [level, setLevel] =
    useState<(typeof STATUSES)[number] extends never ? never : "easy" | "medium" | "hard">("easy");
  const [moduleId, setModuleId] = useState("none");

  const problems = practice.data?.problems ?? [];
  const progress = practice.data?.progress ?? [];

  const statusFor = (problemId: string) =>
    progress.find((p) => p.problem_id === problemId && p.student_id === activeStudent)?.status ??
    "todo";

  const stats = useMemo(() => {
    const totalPoints = problems.reduce((a, p) => a + p.points, 0);
    const solved = progress.filter((p) => p.student_id === activeStudent && p.status === "solved");
    const pts = solved.reduce(
      (a, p) => a + (problems.find((x) => x.id === p.problem_id)?.points ?? 0),
      0,
    );
    return {
      solved: solved.length,
      total: problems.length,
      pct: totalPoints ? Math.round((pts / totalPoints) * 100) : 0,
    };
  }, [problems, progress, activeStudent]);

  const create = useMutation({
    mutationFn: () =>
      addProblem({
        data: {
          module_id: moduleId === "none" ? null : moduleId,
          title: title.trim(),
          platform: platform.trim(),
          url: url.trim() || null,
          level,
          points: level === "hard" ? 5 : level === "medium" ? 3 : 1,
          sort_order: problems.length,
        },
      }),
    onSuccess: () => {
      toast.success("Problem added");
      setOpen(false);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["practice"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mark = useMutation({
    mutationFn: (vars: { problem_id: string; status: (typeof STATUSES)[number] }) =>
      setStatus({ data: { ...vars, student_id: activeStudent } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["practice"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Practice ladder</h1>
          <p className="text-sm text-muted-foreground">
            Easy → medium → hard progression; solved points drive 30% of readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Select value={viewStudent} onValueChange={setViewStudent}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="View student progress" />
              </SelectTrigger>
              <SelectContent>
                {(students.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add problem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add practice problem</DialogTitle>
                  <DialogDescription>Points are set by difficulty (1 / 3 / 5).</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Platform</Label>
                    <Input value={platform} onChange={(e) => setPlatform(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL</Label>
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
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
                        <SelectItem value="none">Not linked</SelectItem>
                        {(modules.data?.modules ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.code} — {m.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={create.isPending || title.trim().length < 3}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeStudent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ladder completion</CardTitle>
            <CardDescription>
              {stats.solved} of {stats.total} problems solved
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Progress value={stats.pct} className="h-2" />
            <span className="w-12 text-right text-sm tabular-nums">{stats.pct}%</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="w-[170px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {p.title} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      p.title
                    )}
                  </TableCell>
                  <TableCell>{p.platform}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.level}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{p.points}</TableCell>
                  <TableCell>
                    <Select
                      value={statusFor(p.id)}
                      onValueChange={(v) =>
                        mark.mutate({ problem_id: p.id, status: v as (typeof STATUSES)[number] })
                      }
                      disabled={!activeStudent}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
