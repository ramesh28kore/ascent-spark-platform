import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { setUserRole } from "@/lib/crt-ops.functions";
import { deleteAccount } from "@/lib/admin.functions";
import { meQuery, rolesQuery } from "@/lib/crt-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export const Route = createFileRoute("/_authenticated/roles")({
  head: () => ({
    meta: [
      { title: "Roles & access — CRT Training Console" },
      {
        name: "description",
        content: "Admin control over CRT roles: admin, trainer, placement cell and student access.",
      },
      { property: "og:title", content: "Roles & access — CRT Training Console" },
      { property: "og:description", content: "Assign CRT console roles to accounts." },
    ],
  }),
  component: RolesPage,
});

const ROLES = ["admin", "trainer", "placement", "student"] as const;

function RolesPage() {
  const me = useQuery(meQuery);
  const data = useQuery(rolesQuery);
  const queryClient = useQueryClient();
  const assign = useServerFn(setUserRole);
  const removeAccount = useServerFn(deleteAccount);
  const [pendingDelete, setPendingDelete] = useState<{ userId: string; name: string } | null>(null);

  const isAdmin = !!me.data?.isAdmin;
  const myUserId = me.data?.profile?.user_id ?? null;

  const change = useMutation({
    mutationFn: (vars: { user_id: string; role: (typeof ROLES)[number] }) => assign({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeAccount({ data: { userId } }),
    onSuccess: () => {
      toast.success("Account deleted");
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profiles = (data.data?.profiles ?? []).filter((p) => p.user_id);
  const roleFor = (userId: string) =>
    (data.data?.roles ?? []).find((r) => r.user_id === userId)?.role ?? "student";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Roles &amp; access</h1>
        <p className="text-sm text-muted-foreground">
          Admins manage the console. Trainers deliver training, the placement cell reads readiness,
          students see their own data only.
        </p>
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">Only admins can change role assignments.</p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription>{profiles.length} linked account(s).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead className="w-[200px]">Role</TableHead>
                {isAdmin && <TableHead className="w-[110px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.email ?? "—"}</TableCell>
                  <TableCell>{p.roll_number ?? "—"}</TableCell>
                  <TableCell>
                    {isAdmin && roleFor(p.user_id!) !== "admin" ? (
                      <Select
                        value={roleFor(p.user_id!)}
                        onValueChange={(v) =>
                          change.mutate({ user_id: p.user_id!, role: v as (typeof ROLES)[number] })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter((r) => r !== "admin").map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : roleFor(p.user_id!) === "admin" ? (
                      <span className="flex items-center gap-2">
                        <Badge>super admin</Badge>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">permanent</span>
                      </span>
                    ) : (
                      <Badge variant="secondary">{roleFor(p.user_id!)}</Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={
                          p.user_id === myUserId ||
                          roleFor(p.user_id!) === "admin" ||
                          remove.isPending
                        }
                        title={
                          roleFor(p.user_id!) === "admin"
                            ? "The super admin account is permanent"
                            : p.user_id === myUserId
                              ? "You cannot remove your own account"
                              : "Delete account"
                        }
                        onClick={() =>
                          setPendingDelete({ userId: p.user_id!, name: p.full_name })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {p.full_name}</span>
                      </Button>
                    </TableCell>
                  )}

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the login, profile and role assignment. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete.userId);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
