import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy } from "lucide-react";

import { getLeaderboard } from "@/lib/exams.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const medal = ["bg-[hsl(var(--accent))]", "bg-muted-foreground/40", "bg-amber-700/60"];

/** Ranking for timed challenge exams: score first, then fastest submission. */
export function Leaderboard({ testId }: { testId: string }) {
  const fetchBoard = useServerFn(getLeaderboard);
  const board = useQuery({
    queryKey: ["leaderboard", testId],
    queryFn: () => fetchBoard({ data: { test_id: testId } }),
    refetchInterval: 30_000,
  });

  const rows = board.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4" /> Leaderboard
        </CardTitle>
        <CardDescription>Highest score wins; ties break on fastest finish.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : null}
        {rows.map((row, index) => (
          <div
            key={row.student_id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background ${
                  medal[index] ?? "bg-muted-foreground/25"
                }`}
              >
                {index + 1}
              </span>
              <span className="truncate">
                {row.full_name}
                {row.roll_number ? (
                  <span className="text-muted-foreground"> · {row.roll_number}</span>
                ) : null}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">
                {row.score}/{row.max_score}
              </Badge>
              <Badge variant="outline">
                {Math.floor(Number(row.seconds) / 60)}m {Math.round(Number(row.seconds) % 60)}s
              </Badge>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
