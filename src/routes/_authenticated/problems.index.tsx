import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  Circle,
  Shuffle,
  Flame,
  CalendarCheck,
} from "lucide-react";

import { bookmarksQuery, dailyChallengeQuery, problemsQuery } from "@/lib/crt-queries";
import { LEVEL_TONE } from "@/lib/problems-shared";
import { ProblemFilters } from "@/components/leetcode/ProblemFilters";
import {
  EMPTY_FILTERS,
  LEVEL_RANK,
  STATUS_RANK,
  parseFilters,
  serialiseFilters,
  type ProblemFilters as Filters,
  type SortKey,
} from "@/lib/problem-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export const Route = createFileRoute("/_authenticated/problems/")({
  validateSearch: (search: Record<string, unknown>) => serialiseFilters(parseFilters(search)),
  head: () => ({
    meta: [
      { title: "Problem set — CRT Training Console" },
      {
        name: "description",
        content:
          "Solve curated placement coding problems with a live editor, sample cases and instant judged verdicts.",
      },
      { property: "og:title", content: "Problem set — CRT Training Console" },
      {
        property: "og:description",
        content: "Curated easy to hard coding problems with a real judge and submission history.",
      },
    ],
  }),
  component: ProblemsPage,
});

const LEVELS = ["easy", "medium", "hard"] as const;

function StatusIcon({ status }: { status: string }) {
  if (status === "solved") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "attempted") return <CircleDashed className="size-4 text-amber-500" />;
  return <Circle className="size-4 text-muted-foreground/40" />;
}

/** Counts consecutive days (ending today or yesterday) with a submission. */
function streakFrom(days: string[]) {
  const set = new Set(days.map((d) => new Date(d).toISOString().slice(0, 10)));
  const day = new Date();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (!set.has(key(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (set.has(key(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

function ProblemsPage() {
  const problems = useQuery(problemsQuery);
  const daily = useQuery(dailyChallengeQuery);
  const bookmarks = useQuery(bookmarksQuery);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [onlyFavourites, setOnlyFavourites] = useState(false);

  const rows = problems.data?.problems ?? [];
  const favourites = useMemo(
    () => new Set(bookmarks.data?.problemIds ?? []),
    [bookmarks.data?.problemIds],
  );

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const p of rows) {
      if (p.category) set.add(p.category);
      for (const tag of p.tags) set.add(tag);
    }
    return [...set].sort();
  }, [rows]);

  const list = useMemo(
    () =>
      rows.filter(
        (p) =>
          (level === "all" || p.level === level) &&
          (status === "all" || p.status === status) &&
          (topic === "all" || p.category === topic || p.tags.includes(topic)) &&
          (!onlyFavourites || favourites.has(p.id)) &&
          `${p.title} ${p.company ?? ""} ${p.tags.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [rows, level, status, topic, search, onlyFavourites, favourites],
  );

  const stats = useMemo(() => {
    const by = (l: string) => rows.filter((p) => p.level === l);
    return LEVELS.map((l) => {
      const all = by(l);
      const solved = all.filter((p) => p.status === "solved").length;
      return { level: l, solved, total: all.length };
    });
  }, [rows]);

  const solvedTotal = rows.filter((p) => p.status === "solved").length;
  const streak = streakFrom(problems.data?.submissionDays ?? []);

  const pickRandom = () => {
    const pool = list.filter((p) => p.status !== "solved");
    const pick = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
    if (pick?.slug) navigate({ to: "/problems/$slug", params: { slug: pick.slug } });
  };

  if (problems.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Problem set</h1>
          <p className="text-sm text-muted-foreground">
            Write, run and submit — every submission is judged on hidden test cases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={pickRandom}>
            <Shuffle className="size-4" /> Pick one
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/problems/plans">Study plans</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/problems/contests">Contests</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/problems/profile">My progress</Link>
          </Button>
        </div>
      </div>

      {daily.data?.today ? (
        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <CalendarCheck className="size-5 text-primary" />
            <div className="mr-auto">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Daily challenge
              </p>
              <p className="font-medium">{daily.data.today.title}</p>
            </div>
            <span className={`text-xs capitalize ${LEVEL_TONE[daily.data.today.level]}`}>
              {daily.data.today.level}
            </span>
            <span className="flex gap-[3px]">
              {daily.data.days.slice(-30).map((d) => (
                <span
                  key={d.on_date}
                  title={`${d.on_date}: ${d.title}${d.solved ? " (solved)" : ""}`}
                  className={`size-2.5 rounded-[2px] ${d.solved ? "bg-emerald-500" : "bg-muted"}`}
                />
              ))}
            </span>
            <Button asChild size="sm">
              <Link to="/problems/$slug" params={{ slug: daily.data.today.slug }}>
                {daily.data.today.solved ? "Solved — revisit" : "Solve today"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}


      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Solved</p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {solvedTotal}
              <span className="text-base font-normal text-muted-foreground">/{rows.length}</span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="size-3.5 text-amber-500" /> {streak} day streak
            </p>
          </div>
          {stats.map((s) => (
            <div key={s.level} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium capitalize ${LEVEL_TONE[s.level]}`}>{s.level}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.solved}/{s.total}
                </span>
              </div>
              <Progress value={s.total ? (s.solved / s.total) * 100 : 0} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search problems, tags or company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={60}
          className="max-w-xs"
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l} className="capitalize">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="attempted">Attempted</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={onlyFavourites ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setOnlyFavourites((v) => !v)}
        >
          <Star className={`size-4 ${onlyFavourites ? "fill-amber-400 text-amber-400" : ""}`} />
          Favourites ({favourites.size})
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Topics</TableHead>
                <TableHead className="w-28">Acceptance</TableHead>
                <TableHead className="w-24">Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p, index) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <StatusIcon status={p.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/problems/$slug"
                      params={{ slug: p.slug ?? "" }}
                      className="hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.company ? (
                      <span className="ml-2 text-xs text-muted-foreground">{p.company}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="font-normal">
                          {t}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {p.acceptance === null ? "—" : `${p.acceptance}%`}
                  </TableCell>
                  <TableCell className={`capitalize font-medium ${LEVEL_TONE[p.level]}`}>
                    {p.level}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {list.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No problems match this filter.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
