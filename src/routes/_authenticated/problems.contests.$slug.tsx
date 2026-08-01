import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Timer, Trophy } from "lucide-react";

import { contestQuery } from "@/lib/crt-queries";
import { joinContest } from "@/lib/leetcode.functions";
import { LEVEL_TONE } from "@/lib/problems-shared";
import { contestPhase } from "@/routes/_authenticated/problems.contests.index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/problems/contests/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — CRT contest` },
        {
          name: "description",
          content: `Scored problems, countdown and live leaderboard for ${name}.`,
        },
        { property: "og:title", content: `${name} — CRT contest` },
        { property: "og:description", content: `Timed coding contest: ${name}.` },
      ],
    };
  },
  component: ContestPage,
});

/** Human countdown to a target instant, refreshed every second. */
function useCountdown(target: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!target) return "";
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "0s";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d ? `${d}d ` : ""}${h}h ${m}m ${s % 60}s`;
}

function ContestPage() {
  const { slug } = Route.useParams();
  const contest = useQuery(contestQuery(slug));
  const queryClient = useQueryClient();
  const join = useServerFn(joinContest);

  const data = contest.data;
  const phase = data ? contestPhase(data.contest.starts_at, data.contest.ends_at) : "upcoming";
  const countdown = useCountdown(
    phase === "upcoming" ? data?.contest.starts_at : data?.contest.ends_at,
  );

  const joinMutation = useMutation({
    mutationFn: (on: boolean) => join({ data: { contest_id: data!.contest.id, join: on } }),
    onSuccess: (res) => {
      toast.success(res.registered ? "You are registered." : "Registration removed.");
      queryClient.invalidateQueries({ queryKey: ["contest", slug] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (contest.isPending && !contest.isError) return <Skeleton className="h-96 w-full" />;
  if (contest.isError || !data)
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">This contest is not available.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/problems/contests">Back to contests</Link>
          </Button>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems/contests">
            <ArrowLeft className="size-4" /> Contests
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold tracking-tight">{data.contest.title}</h1>
        <Badge variant={phase === "live" ? "default" : "outline"}>
          {phase === "live" ? "Live" : phase === "upcoming" ? "Upcoming" : "Ended"}
        </Badge>
        {phase !== "ended" && (
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Timer className="size-4" />
            {phase === "upcoming" ? "starts in" : "ends in"} {countdown}
          </span>
        )}
        <Button
          size="sm"
          variant={data.registered ? "outline" : "default"}
          className="ml-auto"
          disabled={joinMutation.isPending || phase === "ended"}
          onClick={() => joinMutation.mutate(!data.registered)}
        >
          {data.registered ? "Leave contest" : "Register"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{data.contest.description}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Problems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.problems.map((p, i) => (
              <Link
                key={p.id}
                to="/problems/$slug"
                params={{ slug: p.slug }}
                className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-accent/40"
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground">Q{i + 1}</span>
                <span className="flex-1 truncate font-medium">{p.title}</span>
                <span className={`text-xs capitalize ${LEVEL_TONE[p.level]}`}>{p.level}</span>
                <Badge variant="secondary">{p.points} pts</Badge>
              </Link>
            ))}
            {data.problems.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" /> Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Solved</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((row, i) => (
                  <TableRow
                    key={row.student_id}
                    className={row.student_id === data.profileId ? "bg-accent/40" : undefined}
                  >
                    <TableCell className="tabular-nums">{i + 1}</TableCell>
                    <TableCell className="truncate">
                      {row.name}
                      {row.roll_number ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.roll_number}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.solved}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {row.score}
                    </TableCell>
                  </TableRow>
                ))}
                {data.leaderboard.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No accepted submissions inside the contest window yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
