import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Shared client shape helper so every function can resolve the caller's profile row. */
type Client = { from: (t: string) => never };

const ANON = "00000000-0000-0000-0000-000000000000";

const PROBLEM_COLUMNS = "id, slug, title, level, points, category, company, tags, sort_order";

async function myProfileId(supabase: Client | never, userId: string) {
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> };
      };
    };
  };
  const { data } = await client.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/** Problem ids the student has already got accepted. */
async function solvedIds(supabase: Client | never, profileId: string | null) {
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => Promise<{ data: { problem_id: string }[] | null }>;
        };
      };
    };
  };
  const { data } = await client
    .from("problem_submissions")
    .select("problem_id")
    .eq("student_id", profileId ?? ANON)
    .eq("verdict", "accepted");
  return new Set((data ?? []).map((r) => r.problem_id));
}

/* ----------------------------------------------------------- study plans */

export const listStudyPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const [{ data: plans }, { data: items }, solved] = await Promise.all([
      supabase.from("study_plans").select("*").order("sort_order"),
      supabase.from("study_plan_items").select("plan_id, problem_id"),
      solvedIds(supabase as never, profileId),
    ]);

    return (plans ?? []).map((plan) => {
      const own = (items ?? []).filter((i) => i.plan_id === plan.id);
      return {
        ...plan,
        total: own.length,
        solved: own.filter((i) => solved.has(i.problem_id)).length,
      };
    });
  });

export const getStudyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const { data: plan } = await supabase
      .from("study_plans")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!plan) throw new Error("Study plan not found.");

    const [{ data: items }, solved] = await Promise.all([
      supabase
        .from("study_plan_items")
        .select(`sort_order, problem:problem_id (${PROBLEM_COLUMNS})`)
        .eq("plan_id", plan.id)
        .order("sort_order"),
      solvedIds(supabase as never, profileId),
    ]);

    const problems = (items ?? [])
      .map((row) => row.problem as unknown as Record<string, unknown> | null)
      .filter((p): p is Record<string, unknown> => !!p)
      .map((p) => ({
        id: String(p.id),
        slug: String(p.slug ?? ""),
        title: String(p.title ?? ""),
        level: String(p.level ?? "easy"),
        category: (p.category as string | null) ?? null,
        tags: ((p.tags as string[] | null) ?? []) as string[],
        solved: solved.has(String(p.id)),
      }));

    return { plan, problems };
  });

/* --------------------------------------------------------------- contests */

export const listContests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const [{ data: contests }, { data: problems }, { data: regs }] = await Promise.all([
      supabase.from("contests").select("*").order("starts_at", { ascending: false }),
      supabase.from("contest_problems").select("contest_id, problem_id, points"),
      supabase
        .from("contest_registrations")
        .select("contest_id")
        .eq("student_id", profileId ?? ANON),
    ]);

    const joined = new Set((regs ?? []).map((r) => r.contest_id));
    return (contests ?? []).map((c) => {
      const own = (problems ?? []).filter((p) => p.contest_id === c.id);
      return {
        ...c,
        problem_count: own.length,
        total_points: own.reduce((sum, p) => sum + (p.points ?? 0), 0),
        registered: joined.has(c.id),
      };
    });
  });

export const getContest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const { data: contest } = await supabase
      .from("contests")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!contest) throw new Error("Contest not found.");

    const [{ data: rows }, { data: reg }] = await Promise.all([
      supabase
        .from("contest_problems")
        .select(`points, sort_order, problem:problem_id (${PROBLEM_COLUMNS})`)
        .eq("contest_id", contest.id)
        .order("sort_order"),
      supabase
        .from("contest_registrations")
        .select("id")
        .eq("contest_id", contest.id)
        .eq("student_id", profileId ?? ANON)
        .maybeSingle(),
    ]);

    const problems = (rows ?? [])
      .map((row) => ({
        points: row.points ?? 0,
        problem: row.problem as unknown as Record<string, unknown> | null,
      }))
      .filter((r) => !!r.problem)
      .map((r) => ({
        id: String(r.problem!.id),
        slug: String(r.problem!.slug ?? ""),
        title: String(r.problem!.title ?? ""),
        level: String(r.problem!.level ?? "easy"),
        points: r.points,
      }));

    // Scores are computed from accepted submissions inside the contest window.
    // Everybody's submissions are needed, so this read uses the service role and
    // only anonymous-safe fields (name, roll number, score) are returned.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = problems.map((p) => p.id);
    const pointsById = new Map(problems.map((p) => [p.id, p.points]));

    let leaderboard: {
      student_id: string;
      name: string;
      roll_number: string | null;
      solved: number;
      score: number;
      last_at: string | null;
    }[] = [];

    if (ids.length) {
      const { data: subs } = await supabaseAdmin
        .from("problem_submissions")
        .select("student_id, problem_id, created_at")
        .in("problem_id", ids)
        .eq("verdict", "accepted")
        .gte("created_at", contest.starts_at)
        .lte("created_at", contest.ends_at)
        .limit(20000);

      const perStudent = new Map<string, { problems: Set<string>; last: string }>();
      for (const s of subs ?? []) {
        const entry = perStudent.get(s.student_id) ?? { problems: new Set<string>(), last: s.created_at };
        entry.problems.add(s.problem_id);
        if (s.created_at > entry.last) entry.last = s.created_at;
        perStudent.set(s.student_id, entry);
      }

      if (perStudent.size) {
        const { data: people } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, roll_number")
          .in("id", [...perStudent.keys()]);
        const nameById = new Map((people ?? []).map((p) => [p.id, p]));

        leaderboard = [...perStudent.entries()]
          .map(([student_id, entry]) => ({
            student_id,
            name: nameById.get(student_id)?.full_name ?? "Student",
            roll_number: nameById.get(student_id)?.roll_number ?? null,
            solved: entry.problems.size,
            score: [...entry.problems].reduce((sum, id) => sum + (pointsById.get(id) ?? 0), 0),
            last_at: entry.last,
          }))
          .sort((a, b) => b.score - a.score || (a.last_at ?? "").localeCompare(b.last_at ?? ""))
          .slice(0, 100);
      }
    }

    return { contest, problems, registered: !!reg, profileId, leaderboard };
  });

export const joinContest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ contest_id: z.string().uuid(), join: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const profileId = await myProfileId(context.supabase as never, context.userId);
    if (!profileId) throw new Error("No student profile linked to this account.");

    if (data.join) {
      const { error } = await context.supabase
        .from("contest_registrations")
        .insert({ contest_id: data.contest_id, student_id: profileId });
      if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("contest_registrations")
        .delete()
        .eq("contest_id", data.contest_id)
        .eq("student_id", profileId);
      if (error) throw new Error(error.message);
    }
    return { registered: data.join };
  });

/* -------------------------------------------------------------- bookmarks */

export const listBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profileId = await myProfileId(context.supabase as never, context.userId);
    if (!profileId) return { problemIds: [] as string[] };
    const { data } = await context.supabase
      .from("bookmarks")
      .select("problem_id")
      .eq("student_id", profileId)
      .not("problem_id", "is", null);
    return { problemIds: (data ?? []).map((r) => r.problem_id).filter(Boolean) as string[] };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ problem_id: z.string().uuid(), on: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const profileId = await myProfileId(context.supabase as never, context.userId);
    if (!profileId) throw new Error("No student profile linked to this account.");

    if (data.on) {
      const { error } = await context.supabase
        .from("bookmarks")
        .insert({ problem_id: data.problem_id, student_id: profileId });
      if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("bookmarks")
        .delete()
        .eq("problem_id", data.problem_id)
        .eq("student_id", profileId);
      if (error) throw new Error(error.message);
    }
    return { bookmarked: data.on };
  });

/* -------------------------------------------------------- daily challenge */

export const getDailyChallenge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const from = new Date(today.getTime() - 29 * 86_400_000);

    const [{ data: rows }, solved] = await Promise.all([
      supabase
        .from("daily_challenges")
        .select(`on_date, problem:problem_id (${PROBLEM_COLUMNS})`)
        .gte("on_date", iso(from))
        .lte("on_date", iso(today))
        .order("on_date"),
      solvedIds(supabase as never, profileId),
    ]);

    const days = (rows ?? [])
      .map((row) => {
        const p = row.problem as unknown as Record<string, unknown> | null;
        return p
          ? {
              on_date: row.on_date as string,
              id: String(p.id),
              slug: String(p.slug ?? ""),
              title: String(p.title ?? ""),
              level: String(p.level ?? "easy"),
              solved: solved.has(String(p.id)),
            }
          : null;
      })
      .filter((d): d is NonNullable<typeof d> => !!d);

    return { days, today: days.at(-1) ?? null };
  });

/** Per-student contest participation summary used by the achievements page. */
export const getMyContestStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);
    const empty = { registered: 0, participated: 0, bestRank: null as number | null, wins: 0, contests: [] as { slug: string; title: string; rank: number; solved: number; score: number; ends_at: string }[] };
    if (!profileId) return empty;

    const [{ data: contests }, { data: links }, { data: regs }] = await Promise.all([
      supabase.from("contests").select("id, slug, title, starts_at, ends_at").eq("published", true),
      supabase.from("contest_problems").select("contest_id, problem_id, points"),
      supabase.from("contest_registrations").select("contest_id").eq("student_id", profileId),
    ]);

    const registered = new Set((regs ?? []).map((r) => r.contest_id));
    const list = contests ?? [];
    if (!list.length) return { ...empty, registered: registered.size };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allIds = [...new Set((links ?? []).map((l) => l.problem_id))];
    const { data: subs } = allIds.length
      ? await supabaseAdmin
          .from("problem_submissions")
          .select("student_id, problem_id, created_at")
          .in("problem_id", allIds)
          .eq("verdict", "accepted")
          .limit(20000)
      : { data: [] as { student_id: string; problem_id: string; created_at: string }[] };

    const results: { slug: string; title: string; rank: number; solved: number; score: number; ends_at: string }[] = [];

    for (const c of list) {
      const own = (links ?? []).filter((l) => l.contest_id === c.id);
      if (!own.length) continue;
      const pointsById = new Map(own.map((l) => [l.problem_id, l.points ?? 0]));
      const perStudent = new Map<string, { problems: Set<string>; last: string }>();
      for (const s of subs ?? []) {
        if (!pointsById.has(s.problem_id)) continue;
        if (s.created_at < c.starts_at || s.created_at > c.ends_at) continue;
        const entry = perStudent.get(s.student_id) ?? { problems: new Set<string>(), last: s.created_at };
        entry.problems.add(s.problem_id);
        if (s.created_at > entry.last) entry.last = s.created_at;
        perStudent.set(s.student_id, entry);
      }
      if (!perStudent.has(profileId)) continue;

      const ranked = [...perStudent.entries()]
        .map(([student_id, e]) => ({
          student_id,
          solved: e.problems.size,
          score: [...e.problems].reduce((sum, id) => sum + (pointsById.get(id) ?? 0), 0),
          last: e.last,
        }))
        .sort((a, b) => b.score - a.score || a.last.localeCompare(b.last));

      const index = ranked.findIndex((r) => r.student_id === profileId);
      const mine = ranked[index]!;
      results.push({
        slug: c.slug,
        title: c.title,
        rank: index + 1,
        solved: mine.solved,
        score: mine.score,
        ends_at: c.ends_at,
      });
    }

    const ranks = results.map((r) => r.rank);
    return {
      registered: registered.size,
      participated: results.length,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      wins: results.filter((r) => r.rank === 1).length,
      contests: results.sort((a, b) => a.rank - b.rank),
    };
  });
