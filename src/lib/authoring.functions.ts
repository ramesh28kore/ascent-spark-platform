/**
 * Trainer problem-authoring studio: draft CRUD, judge validation and the
 * publish / batch-targeting workflow. Every function is trainer-only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { authoringSchema, publishBlockers } from "@/lib/authoring-shared";

type Client = SupabaseClient<Database>;

async function assertTrainer(supabase: Client, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const staff = (data ?? []).some((r) => r.role === "trainer");
  if (!staff) throw new Error("Only trainers can author problems.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return profile?.id ?? null;
}

/* ------------------------------------------------------------------ list */

export const listAuthoredProblems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTrainer(context.supabase, context.userId);

    const [{ data: problems, error }, { data: targets }, { data: batches }] = await Promise.all([
      context.supabase
        .from("practice_problems")
        .select(
          "id, slug, title, level, category, company, company_frequency, module_id, points, tags, statement, constraints, examples, hints, test_cases, starter_code, solution, editorial, time_limit_ms, memory_limit_kb, status, published_at, visible_to_all_batches, updated_at",
        )
        .order("updated_at", { ascending: false }),
      context.supabase.from("problem_batches").select("problem_id, batch_id"),
      context.supabase.from("batches").select("id, name, active").order("name"),
    ]);
    if (error) throw new Error(error.message);

    return {
      problems: problems ?? [],
      targets: targets ?? [],
      batches: batches ?? [],
    };
  });

/* ------------------------------------------------------------------ save */

export const saveProblemDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => authoringSchema.parse(input))
  .handler(async ({ data, context }) => {
    const authorId = await assertTrainer(context.supabase, context.userId);

    const payload = {
      title: data.title,
      slug: data.slug,
      level: data.level,
      category: data.category,
      company: data.company,
      company_frequency: data.company_frequency,
      module_id: data.module_id,
      points: data.points,
      tags: data.tags,
      statement: data.statement,
      constraints: data.constraints,
      examples: data.examples,
      hints: data.hints,
      test_cases: data.test_cases,
      starter_code: data.starter_code,
      solution: data.solution,
      editorial: data.editorial,
      time_limit_ms: data.time_limit_ms,
      memory_limit_kb: data.memory_limit_kb,
      visible_to_all_batches: data.visible_to_all_batches,
      platform: "in-house",
      author_id: authorId,
    };

    let problemId = data.id;
    if (problemId) {
      const { error } = await context.supabase
        .from("practice_problems")
        .update(payload)
        .eq("id", problemId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("practice_problems")
        .insert({ ...payload, status: "draft", sort_order: 900 })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      problemId = created.id;
    }

    await context.supabase.from("problem_batches").delete().eq("problem_id", problemId!);
    if (!data.visible_to_all_batches && data.batch_ids.length) {
      const { error } = await context.supabase
        .from("problem_batches")
        .insert(data.batch_ids.map((batch_id) => ({ problem_id: problemId!, batch_id })));
      if (error) throw new Error(error.message);
    }

    return { id: problemId! };
  });

/* -------------------------------------------------------------- validate */

/** Runs the trainer's reference solution against every case before publish. */
export const validateProblemCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        language: z.enum(["python", "javascript"]),
        code: z.string().trim().min(1, { message: "add a reference solution first" }).max(20000),
        time_limit_ms: z.number().int().min(500).max(15000),
        memory_limit_kb: z.number().int().min(16000).max(512000),
        cases: z
          .array(
            z.object({
              input: z.string().max(10000),
              expected_output: z.string().max(10000),
              hidden: z.boolean(),
            }),
          )
          .min(1)
          .max(60),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertTrainer(context.supabase, context.userId);

    const { judgeAgainstCases } = await import("@/lib/judge.server");
    const judged = await judgeAgainstCases({
      language: data.language,
      code: data.code,
      // The trainer authored every case, so nothing is masked here.
      cases: data.cases.map((c) => ({ ...c, hidden: false })),
      timeoutMs: data.time_limit_ms,
      memoryKb: data.memory_limit_kb,
    });

    if (judged.unreachable) throw new Error("The judge is unavailable right now. Try again.");

    return {
      passed: judged.passed,
      total: judged.total,
      allPassed: judged.passed === judged.total,
      runtime_ms: judged.runtime_ms,
      memory_kb: judged.memory_kb,
      results: judged.results,
    };
  });

/* --------------------------------------------------------------- publish */

export const setProblemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["draft", "published"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertTrainer(context.supabase, context.userId);

    if (data.status === "published") {
      const { data: problem } = await context.supabase
        .from("practice_problems")
        .select("statement, solution, test_cases, visible_to_all_batches")
        .eq("id", data.id)
        .maybeSingle();
      if (!problem) throw new Error("Problem not found.");

      const { data: targets } = await context.supabase
        .from("problem_batches")
        .select("batch_id")
        .eq("problem_id", data.id);

      const cases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
      const blockers = publishBlockers({
        test_cases: cases,
        statement: problem.statement ?? "",
        solution: problem.solution,
        visible_to_all_batches: !!problem.visible_to_all_batches,
        batch_ids: (targets ?? []).map((t) => t.batch_id),
      });
      if (blockers.length) throw new Error(blockers.join(" "));
    }

    const { error } = await context.supabase
      .from("practice_problems")
      .update({
        status: data.status,
        published_at: data.status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true, status: data.status };
  });

export const deleteAuthoredProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertTrainer(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("practice_problems")
      .delete()
      .eq("id", data.id)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
