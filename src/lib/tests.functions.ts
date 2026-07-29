import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  generateTestSchema,
  submitSchema,
  pickByDistribution,
  seededShuffle,
  scoreResponses,
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

export const setTestPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tests")
      .update({ published: data.published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

    const { data: items } = await supabase
      .from("test_items")
      .select("id, question_id, marks, sort_order")
      .eq("test_id", data.test_id)
      .order("sort_order");

    const ids = (items ?? []).map((i) => i.question_id);
    const { data: questions } = ids.length
      ? await supabase.from("questions").select("id, prompt, options, level, bloom, marks, qtype").in("id", ids)
      : { data: [] };

    const byId = new Map((questions ?? []).map((q) => [q.id, q]));
    let paper = (items ?? []).map((i) => ({
      item_id: i.id,
      question_id: i.question_id,
      marks: i.marks,
      prompt: byId.get(i.question_id)?.prompt ?? "",
      options: (byId.get(i.question_id)?.options ?? []) as unknown as string[],
      level: byId.get(i.question_id)?.level ?? "easy",
      qtype: (byId.get(i.question_id)?.qtype ?? "mcq") as string,
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

    return { test, paper, attempt, profile_id: profile?.id ?? null };
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

