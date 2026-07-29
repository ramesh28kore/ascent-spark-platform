import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, RefreshCw } from "lucide-react";

import { markNotificationRead, runAlertSweep } from "@/lib/crt-ops.functions";
import { meQuery, notificationsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CRT Training Console" },
      {
        name: "description",
        content: "Attendance shortfall and upcoming-test alerts for CRT students and trainers.",
      },
      { property: "og:title", content: "Alerts — CRT Training Console" },
      { property: "og:description", content: "Automated CRT notifications and reminders." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const me = useQuery(meQuery);
  const notifications = useQuery(notificationsQuery);
  const queryClient = useQueryClient();
  const sweep = useServerFn(runAlertSweep);
  const readOne = useServerFn(markNotificationRead);

  const isStaff = !!me.data?.isStaff;

  const run = useMutation({
    mutationFn: () => sweep(),
    onSuccess: (r) => {
      toast.success(`${r.created} alert(s) generated`);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const read = useMutation({
    mutationFn: (id: string) => readOne({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = notifications.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Attendance shortfalls below 75% and tests starting within three days.
          </p>
        </div>
        {isStaff && (
          <Button size="sm" className="gap-2" onClick={() => run.mutate()} disabled={run.isPending}>
            <RefreshCw className="h-4 w-4" /> Run alert sweep
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {list.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-70" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-muted-foreground" />
                  {n.title}
                </span>
                <Badge variant={n.kind === "attendance" ? "destructive" : "secondary"}>{n.kind}</Badge>
              </CardTitle>
              <CardDescription>{new Date(n.created_at).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{n.body}</p>
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => read.mutate(n.id)}>
                  Mark read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No alerts right now.</p>}
      </div>
    </div>
  );
}
