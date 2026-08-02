import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { parseCases } from "@/lib/problems-shared";

const LIST_COLUMNS =
  "id, slug, title, level, points, category, company, company_frequency, tags, module_id, sort_order, platform, url";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, statement, constraints, examples, hints, starter_code, test_cases, solution, editorial, time_limit_ms, memory_limit_kb`;

async function myProfileId(supabase: { from: (t: string) => never } | never, userId: string) {
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          a: string,
          b: string,
        ) => { maybeSingle: () => Promise<{ data: { id: string } | null }> };
      };
    };
  };
  const { data } = await client.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/* ------------------------------------------------------------------ list */

export const listProblems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const anon = "00000000-0000-0000-0000-000000000000";
    const [{ data: problems, error }, { data: progress }, { data: mine }] = await Promise.all([
      supabase
        .from("practice_problems")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .not("statement", "is", null)
        .order("sort_order"),
      supabase
        .from("practice_progress")
        .select("problem_id, status")
        .eq("student_id", profileId ?? anon),
      supabase
        .from("problem_submissions")
        .select("problem_id, verdict, created_at")
        .eq("student_id", profileId ?? anon)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (error) throw new Error(error.message);

    // Acceptance rate needs everybody's submissions, so it is read with the
    // service role and returned only as anonymous aggregate counts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: all } = await supabaseAdmin
      .from("problem_submissions")
      .select("problem_id, verdict")
      .limit(20000);

    const stats = new Map<string, { total: number; accepted: number }>();
    for (const row of all ?? []) {
      const entry = stats.get(row.problem_id) ?? { total: 0, accepted: 0 };
      entry.total += 1;
      if (row.verdict === "accepted") entry.accepted += 1;
      stats.set(row.problem_id, entry);
    }

    const statusById = new Map<string, string>();
    for (const row of progress ?? []) statusById.set(row.problem_id, row.status);
    for (const row of mine ?? []) {
      if (row.verdict === "accepted") statusById.set(row.problem_id, "solved");
      else if (!statusById.has(row.problem_id)) statusById.set(row.problem_id, "attempted");
    }

    return {
      profileId,
      problems: (problems ?? []).map((p) => {
        const stat = stats.get(p.id) ?? { total: 0, accepted: 0 };
        return {
          ...p,
          tags: (p.tags ?? []) as string[],
          status: statusById.get(p.id) ?? "todo",
          submissions: stat.total,
          acceptance: stat.total ? Math.round((stat.accepted / stat.total) * 100) : null,
        };
      }),
      submissionDays: (mine ?? []).map((row) => row.created_at),
    };
  });

/* ---------------------------------------------------------------- detail */

export const getProblem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);

    const { data: problem, error } = await supabase
      .from("practice_problems")
      .select(DETAIL_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!problem) throw new Error("Problem not found.");

    const [{ data: submissions }, { data: posts }, { data: staff }] = await Promise.all([
      supabase
        .from("problem_submissions")
        .select("*")
        .eq("problem_id", problem.id)
        .eq("student_id", profileId ?? "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("discussion_posts")
        .select("id, body, created_at, author_id, profiles:author_id (full_name)")
        .eq("problem_id", problem.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isStaff = (staff ?? []).some((r) => r.role === "trainer" || r.role === "placement");
    const attempts = (submissions ?? []).length;
    const solved = (submissions ?? []).some((s) => s.verdict === "accepted");
    const unlocked = isStaff || solved || attempts >= 3;

    const cases = parseCases(problem.test_cases);

    // "What should I solve next?" — the next published problem in the set that
    // this student has not solved yet.
    const anon = "00000000-0000-0000-0000-000000000000";
    const [{ data: queue }, { data: mySolved }] = await Promise.all([
      supabase
        .from("practice_problems")
        .select("id, slug, title, level, sort_order")
        .eq("status", "published")
        .not("statement", "is", null)
        .not("slug", "is", null)
        .order("sort_order"),
      supabase
        .from("problem_submissions")
        .select("problem_id, verdict")
        .eq("student_id", profileId ?? anon)
        .eq("verdict", "accepted")
        .limit(2000),
    ]);

    const solvedIds = new Set((mySolved ?? []).map((s) => s.problem_id));
    const list = (queue ?? []).map((p) => ({
      id: p.id,
      slug: p.slug ?? "",
      title: p.title,
      level: p.level,
    }));

    const currentIndex = list.findIndex((p) => p.id === problem.id);
    const after = currentIndex >= 0 ? list.slice(currentIndex + 1) : list;
    const nextProblem =
      after.find((p) => !solvedIds.has(p.id)) ??
      list.find((p) => p.id !== problem.id && !solvedIds.has(p.id)) ??
      null;

    return {
      profileId,
      isStaff,
      solved,
      attempts,
      position: currentIndex >= 0 ? { index: currentIndex + 1, total: list.length } : null,
      nextProblem,
      problem: {
        ...problem,
        tags: (problem.tags ?? []) as string[],
        // Hidden expectations and the editorial never leave the server early.
        test_cases: cases.filter((c) => !c.hidden),
        hidden_count: cases.filter((c) => c.hidden).length,
        solution: unlocked ? problem.solution : null,
        editorial: unlocked ? problem.editorial : null,
        solution_locked: !unlocked,
      },
      submissions: submissions ?? [],
      posts: posts ?? [],
    };
  });

/* ------------------------------------------------------------------- run */

const runSchema = z.object({
  problem_id: z.string().uuid(),
  language: z.enum(["python", "javascript"]),
  code: z.string().trim().min(1, { message: "write some code first" }).max(20000),
  stdin: z.string().max(10000).optional(),
});

/** Runs the visible sample cases (or a custom stdin) without recording a score. */
export const runProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => runSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: problem } = await context.supabase
      .from("practice_problems")
      .select("test_cases, time_limit_ms, memory_limit_kb")
      .eq("id", data.problem_id)
      .maybeSingle();
    if (!problem) throw new Error("Problem not found.");

    const { executeCode, judgeAgainstCases } = await import("@/lib/judge.server");

    if (data.stdin !== undefined) {
      const result = await executeCode({
        language: data.language,
        code: data.code,
        stdin: data.stdin,
        timeoutMs: problem.time_limit_ms ?? 5000,
        memoryKb: problem.memory_limit_kb ?? 128000,
      });
      return {
        mode: "stdin" as const,
        stdout: result.stdout,
        stderr: result.stderr,
        output: result.output,
        runtime_ms: result.runtime_ms,
        memory_kb: result.memory_kb,
        error: result.error ?? null,
        results: [],
        passed: 0,
        total: 0,
      };
    }

    const samples = parseCases(problem.test_cases).filter((c) => !c.hidden);
    const judged = await judgeAgainstCases({
      language: data.language,
      code: data.code,
      cases: samples,
      timeoutMs: problem.time_limit_ms ?? 5000,
      memoryKb: problem.memory_limit_kb ?? 128000,
    });

    return {
      mode: "cases" as const,
      stdout: "",
      stderr: "",
      output: "",
      runtime_ms: judged.runtime_ms,
      memory_kb: judged.memory_kb,
      error: judged.unreachable ? "The judge is unavailable right now." : null,
      results: judged.results,
      passed: judged.passed,
      total: judged.total,
    };
  });

/* ---------------------------------------------------------------- submit */

const submitSchema = z.object({
  problem_id: z.string().uuid(),
  language: z.enum(["python", "javascript"]),
  code: z.string().trim().min(1, { message: "write some code first" }).max(20000),
});

/** Authoritative submission: every case is judged server side and recorded. */
export const submitProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);
    if (!profileId) throw new Error("No student profile linked to this account.");

    const { data: problem } = await supabase
      .from("practice_problems")
      .select("id, test_cases, time_limit_ms, memory_limit_kb")
      .eq("id", data.problem_id)
      .maybeSingle();
    if (!problem) throw new Error("Problem not found.");

    const cases = parseCases(problem.test_cases);
    if (cases.length === 0) throw new Error("This problem has no test cases yet.");

    const { judgeAgainstCases } = await import("@/lib/judge.server");
    const judged = await judgeAgainstCases({
      language: data.language,
      code: data.code,
      cases,
      timeoutMs: problem.time_limit_ms ?? 5000,
      memoryKb: problem.memory_limit_kb ?? 128000,
    });

    if (judged.unreachable)
      throw new Error("The judge is unavailable right now. Try again shortly.");

    const first = judged.results.find((r) => !r.passed);
    const verdict =
      judged.passed === judged.total
        ? "accepted"
        : first?.error
          ? /time/i.test(first.error)
            ? "time limit exceeded"
            : "runtime error"
          : "wrong answer";

    // Hidden expectations stay hidden in the stored result too.
    const caseResults = judged.results.map((r) =>
      r.hidden ? { index: r.index, hidden: true, passed: r.passed, runtime_ms: r.runtime_ms } : r,
    );

    const { error: insertError } = await supabase.from("problem_submissions").insert({
      problem_id: problem.id,
      student_id: profileId,
      code: data.code,
      language: data.language,
      verdict,
      cases_passed: judged.passed,
      cases_total: judged.total,
      runtime_ms: judged.runtime_ms,
      memory_kb: judged.memory_kb,
      case_results: caseResults as never,
    });
    if (insertError) throw new Error(insertError.message);

    await supabase.from("practice_progress").upsert(
      {
        student_id: profileId,
        problem_id: problem.id,
        status: verdict === "accepted" ? "solved" : "attempted",
      },
      { onConflict: "student_id,problem_id" },
    );

    return {
      verdict,
      passed: judged.passed,
      total: judged.total,
      runtime_ms: judged.runtime_ms,
      memory_kb: judged.memory_kb,
      results: caseResults,
    };
  });

/* ------------------------------------------------------------- discussion */

export const postProblemComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ problem_id: z.string().uuid(), body: z.string().trim().min(2).max(2000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const profileId = await myProfileId(context.supabase as never, context.userId);
    if (!profileId) throw new Error("No profile linked to this account.");
    const { error } = await context.supabase
      .from("discussion_posts")
      .insert({ problem_id: data.problem_id, author_id: profileId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------- profile */

export const getProblemProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await myProfileId(supabase as never, userId);
    if (!profileId) return { submissions: [], problems: [], profile: null };

    const [{ data: profile }, { data: submissions }, { data: problems }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, roll_number, batch")
        .eq("id", profileId)
        .maybeSingle(),
      supabase
        .from("problem_submissions")
        .select("id, problem_id, verdict, language, runtime_ms, created_at")
        .eq("student_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("practice_problems")
        .select("id, slug, title, level, category, tags")
        .not("statement", "is", null),
    ]);

    return {
      profile: profile ?? null,
      submissions: submissions ?? [],
      problems: (problems ?? []).map((p) => ({ ...p, tags: (p.tags ?? []) as string[] })),
    };
  });
