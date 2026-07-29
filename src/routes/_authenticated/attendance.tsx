import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { markAttendance } from "@/lib/crt-ops.functions";
import { attendanceQuery, meQuery, sessionsQuery, studentsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — CRT Training Console" },
      {
        name: "description",
        content: "Mark session-wise CRT attendance and monitor the 75% minimum threshold per student.",
      },
      { property: "og:title", content: "Attendance — CRT Training Console" },
      { property: "og:description", content: "Session attendance capture and shortfall tracking." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const me = useQuery(meQuery);
  const sessions = useQuery(sessionsQuery);
  const students = useQuery(studentsQuery);
  const attendance = useQuery(attendanceQuery);
  const queryClient = useQueryClient();
  const mark = useServerFn(markAttendance);

  const isStaff = !!me.data?.isStaff;
  const [sessionId, setSessionId] = useState<string>("");
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  const activeSession = (sessions.data ?? []).find((s) => s.id === sessionId) ?? null;

  const roster = useMemo(() => {
    const all = students.data ?? [];
    if (!activeSession?.batch_id) return all;
    return all.filter((s) => s.batch_id === activeSession.batch_id);
  }, [students.data, activeSession]);

  const existing = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of attendance.data ?? []) {
      if (a.session_id === sessionId) map.set(a.student_id, a.present);
    }
    return map;
  }, [attendance.data, sessionId]);

  const isPresent = (id: string) => draft[id] ?? existing.get(id) ?? true;

  const submit = useMutation({
    mutationFn: () =>
      mark({
        data: {
          session_id: sessionId,
          entries: roster.map((s) => ({ student_id: s.id, present: isPresent(s.id) })),
        },
      }),
    onSuccess: () => {
      toast.success("Attendance saved");
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = (students.data ?? []).map((s) => {
    const rows = (attendance.data ?? []).filter((a) => a.student_id === s.id);
    const present = rows.filter((a) => a.present).length;
    const pctVal = rows.length ? Math.round((present / rows.length) * 100) : 0;
    return { ...s, present, total: rows.length, pct: pctVal };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Mark presence session by session. Anyone below 75% is flagged for follow-up.
        </p>
      </div>

      {isStaff && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mark a session</CardTitle>
            <CardDescription>Pick a session, then tick the students who attended.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {(sessions.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.scheduled_at).toLocaleDateString()} — {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sessionId && (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {roster.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border p-2 text-sm"
                    >
                      <Checkbox
                        checked={isPresent(s.id)}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, [s.id]: v === true }))
                        }
                      />
                      <span className="truncate">
                        {s.full_name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {s.roll_number ?? ""}
                        </span>
                      </span>
                    </label>
                  ))}
                  {roster.length === 0 && (
                    <p className="text-sm text-muted-foreground">No students in this batch.</p>
                  )}
                </div>
                <Button
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending || roster.length === 0}
                >
                  Save attendance
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance summary</CardTitle>
          <CardDescription>Cumulative percentage across all marked sessions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Attended</TableHead>
                <TableHead className="w-[220px]">Attendance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.roll_number ?? "—"}</TableCell>
                  <TableCell>
                    {s.present}/{s.total}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={s.pct} className="h-2" />
                      <span className="w-10 text-right text-xs tabular-nums">{s.pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.pct >= 75 ? "default" : "destructive"}>
                      {s.pct >= 75 ? "OK" : "Shortfall"}
                    </Badge>
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
