import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { upsertBatch, setStudentBatch } from "@/lib/crt-ops.functions";
import { batchesQuery, meQuery, studentsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({
    meta: [
      { title: "Batches — CRT Training Console" },
      {
        name: "description",
        content: "Create CRT batches per academic year and branch, then assign students to them.",
      },
      { property: "og:title", content: "Batches — CRT Training Console" },
      { property: "og:description", content: "Manage CRT batch cohorts and student allocation." },
    ],
  }),
  component: BatchesPage,
});

function BatchesPage() {
  const me = useQuery(meQuery);
  const batches = useQuery(batchesQuery);
  const students = useQuery(studentsQuery);
  const queryClient = useQueryClient();
  const saveBatch = useServerFn(upsertBatch);
  const assign = useServerFn(setStudentBatch);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState("2025-26");
  const [branch, setBranch] = useState("");

  const isStaff = !!me.data?.isStaff;

  const create = useMutation({
    mutationFn: () =>
      saveBatch({
        data: {
          name: name.trim(),
          academic_year: year.trim(),
          branch: branch.trim() || null,
          active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Batch saved");
      setOpen(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: (vars: { student_id: string; batch_id: string | null }) => assign({ data: vars }),
    onSuccess: () => {
      toast.success("Student moved");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = students.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Batches</h1>
          <p className="text-sm text-muted-foreground">
            Cohorts drive scheduling, attendance and test targeting.
          </p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New batch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create batch</DialogTitle>
                <DialogDescription>Give the cohort a name and academic year.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="CRT-2026-A"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Academic year</Label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Branch (optional)</Label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="CSE"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || name.trim().length < 2}
                >
                  Save batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(batches.data ?? []).map((b) => {
          const count = rows.filter((s) => s.batch_id === b.id).length;
          return (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {b.name}
                  <Badge variant={b.active ? "default" : "secondary"}>
                    {b.active ? "Active" : "Archived"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {b.academic_year}
                  {b.branch ? ` · ${b.branch}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{count} students</CardContent>
            </Card>
          );
        })}
        {batches.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No batches yet.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student allocation</CardTitle>
          <CardDescription>Assign each student to a batch.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-[220px]">Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.roll_number ?? "—"}</TableCell>
                  <TableCell>{s.branch ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={s.batch_id ?? "none"}
                      onValueChange={(v) =>
                        move.mutate({ student_id: s.id, batch_id: v === "none" ? null : v })
                      }
                      disabled={!isStaff}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {(batches.data ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
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
