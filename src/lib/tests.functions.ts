import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  generateTestSchema,
  manualTestSchema,
  mcqImportSchema,
  submitSchema,
  pickByDistribution,
  seededShuffle,
} from "@/lib/tests.server";


export const getTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: tests }, { data: items }, { data: attempts }] = await Promise.all([
      context.supabase.from("tests").select("*").order("starts_at", { ascending: false }),
      context.supabase.from("test_items").select("id, test_id, question_id, marks, sort_order"),
      context.supabase.from("test_attempts").select("*"),
    ]);
    const { data: qtypes } = await context.supabase.from("questions").select("id, qtype");
    return {
      tests: tests ?? [],
      items: items ?? [],
      attempts: attempts ?? [],
      questionTypes: qtypes ?? [],
    };
  });

export const generateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateTestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("questions")
      .select("id, level, bloom, marks, module_id")
      .in("qtype", data.qtypes);
    if (data.module_id) query = query.eq("module_id", data.module_id);
    const { data: pool, error: poolErr } = await query;
    if (poolErr) throw new Error(poolErr.message);
    if (!pool || pool.length === 0)
      throw new Error(
        data.qtypes.includes("coding") && data.qtypes.length === 1
          ? "No coding questions in the bank for this module yet. Add coding questions first, or pick All modules."
          : "No questions of that type available for the selected module.",
      );

    const picked = pickByDistribution(pool, data.count, {
      easy: data.easy_pct,
      medium: data.medium_pct,
      hard: data.hard_pct,
    });

    const { data: test, error } = await supabase
      .from("tests")
      .insert({
        title: data.title,
        batch_id: data.batch_id,
        module_id: data.module_id,
        assessment_id: data.assessment_id,
        starts_at: data.starts_at,
        duration_min: data.duration_min,
        shuffle: data.shuffle,
        published: data.publish,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const rows = picked.map((q, i) => ({
      test_id: test.id,
      question_id: q.id,
      marks: q.marks ?? 1,
      sort_order: i,
    }));
    const { error: itemErr } = await supabase.from("test_items").insert(rows);
    if (itemErr) throw new Error(itemErr.message);
    return { ok: true, test_id: test.id, items: rows.length };
  });

/** Trainer-built paper: the exact questions the trainer picked, in their order. */
export const createManualTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualTestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ids = data.items.map((i) => i.question_id);
    const { data: pool, error: poolErr } = await supabase
      .from("questions")
      .select("id, marks")
      .in("id", ids);
    if (poolErr) throw new Error(poolErr.message);
    const known = new Set((pool ?? []).map((q) => q.id));
    if (known.size !== ids.length) throw new Error("Some selected questions no longer exist.");

    const { data: test, error } = await supabase
      .from("tests")
      .insert({
        title: data.title,
        batch_id: data.batch_id,
        module_id: data.module_id,
        assessment_id: data.assessment_id,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        duration_min: data.duration_min,
        shuffle: data.shuffle,
        published: data.publish,
        exam_kind: "mcq_quiz",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const rows = data.items.map((item, i) => ({
      test_id: test.id,
      question_id: item.question_id,
      marks: item.marks,
      sort_order: i,
    }));
    const { error: itemErr } = await supabase.from("test_items").insert(rows);
    if (itemErr) throw new Error(itemErr.message);
    return { ok: true, test_id: test.id, items: rows.length };
  });

/** Bulk import of MCQs pasted from Notepad. */
export const importMcqQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => mcqImportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const rows = data.questions.map((q) => ({
      module_id: data.module_id,
      prompt: q.prompt,
      qtype: "mcq" as const,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      level: q.level,
      bloom: data.bloom,
      marks: q.marks,
      test_cases: [],
    }));
    const { data: inserted, error } = await context.supabase
      .from("questions")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { ok: true, imported: inserted?.length ?? 0, ids: (inserted ?? []).map((r) => r.id) };
  });

export const setTestPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        published: z.boolean().optional(),
        results_released: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { published?: boolean; results_released?: boolean } = {};
    if (typeof data.published === "boolean") patch.published = data.published;
    if (typeof data.results_released === "boolean")
      patch.results_released = data.results_released;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("tests").update(patch).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marks sheet for a single test — trainers, placement staff and admin only. */
export const getTestResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) =>
      ["trainer", "placement", "admin"].includes(r.role as string),
    );
    if (!isStaff) throw new Error("Only trainers can download the marks sheet.");

    const { data: test, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", data.test_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!test) throw new Error("Test not found.");

    const [{ data: items }, { data: attempts }] = await Promise.all([
      supabase.from("test_items").select("question_id, marks").eq("test_id", data.test_id),
      supabase.from("test_attempts").select("*").eq("test_id", data.test_id),
    ]);

    const questionIds = (items ?? []).map((i) => i.question_id);
    const { data: keys } = questionIds.length
      ? await supabase.rpc("staff_questions")
      : { data: [] };
    const keyById = new Map(
      ((keys ?? []) as { id: string; answer: string | null }[]).map((q) => [q.id, q.answer]),
    );

    const studentIds = (attempts ?? []).map((a) => a.student_id);
    const { data: students } = studentIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, roll_number, email, branch, batch")
          .in("id", studentIds)
      : { data: [] };
    const byStudent = new Map((students ?? []).map((s) => [s.id, s]));

    const normalise = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
    const rows = (attempts ?? []).map((a) => {
      const responses = (a.responses ?? {}) as Record<string, string>;
      let correct = 0;
      let attemptedCount = 0;
      for (const item of items ?? []) {
        const given = responses[item.question_id];
        if (given) attemptedCount += 1;
        const key = keyById.get(item.question_id);
        if (key && given && normalise(key) === normalise(given)) correct += 1;
      }
      const profile = byStudent.get(a.student_id);
      const seconds =
        a.submitted_at && a.started_at
          ? Math.max(
              0,
              Math.round(
                (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000,
              ),
            )
          : null;
      return {
        student_id: a.student_id,
        full_name: profile?.full_name ?? "Unknown",
        roll_number: profile?.roll_number ?? "",
        email: profile?.email ?? "",
        branch: profile?.branch ?? "",
        batch: profile?.batch ?? "",
        score: Number(a.score ?? 0),
        max_score: Number(a.max_score ?? 0),
        correct,
        attempted: attemptedCount,
        total_questions: (items ?? []).length,
        blur_count: Number(a.blur_count ?? 0),
        seconds,
        submitted_at: a.submitted_at,
        started_at: a.started_at,
      };
    });

    rows.sort((a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name));
    return { test, rows, totalMarks: (items ?? []).reduce((sum, i) => sum + (i.marks ?? 0), 0) };
  });

/** Per-question review for the signed-in student, once the trainer releases results. */
export const getAttemptReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("attempt_review", {
      _test_id: data.test_id,
    });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });


export const deleteTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Paper for the signed-in student: answers stripped, order shuffled per student. */
export const getTestPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: test, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", data.test_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!test) throw new Error("Test not found or not published.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) =>
      ["trainer", "admin", "placement"].includes(r.role as string),
    );

    // Students can only see the question list while an attempt is live, so
    // open the attempt before loading the paper — but only inside the window.
    const nowMs = Date.now();
    const windowOpen =
      new Date(test.starts_at).getTime() <= nowMs &&
      (!test.ends_at || new Date(test.ends_at).getTime() >= nowMs);
    if (!isStaff && profile && test.published && windowOpen) {

      await supabase
        .from("test_attempts")
        .upsert(
          { test_id: data.test_id, student_id: profile.id, started_at: new Date().toISOString() },
          { onConflict: "test_id,student_id", ignoreDuplicates: true },
        );
    }

    const { data: items } = await supabase
      .from("test_items")
      .select("id, question_id, marks, sort_order")
      .eq("test_id", data.test_id)
      .order("sort_order");

    const ids = (items ?? []).map((i) => i.question_id);
    const { data: questions } = ids.length
      ? await supabase
          .from("questions")
          .select("id, prompt, options, level, bloom, marks, qtype, test_cases")
          .in("id", ids)
      : { data: [] };

    const byId = new Map((questions ?? []).map((q) => [q.id, q]));
    const visibleCases = (raw: unknown) =>
      (Array.isArray(raw) ? raw : [])
        .filter((c) => c && typeof c === "object" && !(c as { hidden?: boolean }).hidden)
        .map((c) => ({
          input: String((c as { input?: unknown }).input ?? ""),
          expected_output: String((c as { expected_output?: unknown }).expected_output ?? ""),
        }));
    const caseCount = (raw: unknown) => (Array.isArray(raw) ? raw.length : 0);

    let paper = (items ?? []).map((i) => ({
      item_id: i.id,
      question_id: i.question_id,
      marks: i.marks,
      prompt: byId.get(i.question_id)?.prompt ?? "",
      options: (byId.get(i.question_id)?.options ?? []) as unknown as string[],
      level: byId.get(i.question_id)?.level ?? "easy",
      qtype: (byId.get(i.question_id)?.qtype ?? "mcq") as string,
      sample_cases: visibleCases(byId.get(i.question_id)?.test_cases),
      total_cases: caseCount(byId.get(i.question_id)?.test_cases),
    }));
    if (test.shuffle) paper = seededShuffle(paper, `${test.id}:${profile?.id ?? userId}`);

    const { data: attempt } = profile
      ? await supabase
          .from("test_attempts")
          .select("*")
          .eq("test_id", data.test_id)
          .eq("student_id", profile.id)
          .maybeSingle()
      : { data: null };

    const { data: codingSubmissions } = await supabase
      .from("coding_submissions")
      .select("*")
      .eq("test_id", data.test_id);

    return {
      test,
      paper,
      attempt,
      profile_id: profile?.id ?? null,
      codingSubmissions: codingSubmissions ?? [],
    };
  });

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("No student profile linked to this account.");

    // The exam window is authoritative: no early entry, no late entry.
    const { data: test } = await supabase
      .from("tests")
      .select("starts_at, ends_at, published")
      .eq("id", data.test_id)
      .maybeSingle();
    if (!test || !test.published) throw new Error("This test is not open yet.");
    const now = Date.now();
    if (new Date(test.starts_at).getTime() > now)
      throw new Error(`This test opens at ${new Date(test.starts_at).toLocaleString()}.`);
    if (test.ends_at && new Date(test.ends_at).getTime() < now)
      throw new Error("The exam window for this test has closed.");

    const { error } = await supabase
      .from("test_attempts")
      .upsert(
        { test_id: data.test_id, student_id: profile.id, started_at: new Date().toISOString() },
        { onConflict: "test_id,student_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Grading is done entirely in the database: answer keys never leave the
    // server, the deadline is enforced there and resubmission is rejected.
    const { data: result, error } = await context.supabase.rpc("grade_attempt", {
      _test_id: data.test_id,
      _responses: data.responses,
      _blur_count: data.blur_count,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    return {
      ok: true,
      score: Number(row?.score ?? 0),
      maxScore: Number(row?.max_score ?? 0),
    };
  });
