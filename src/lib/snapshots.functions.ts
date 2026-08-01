import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const scopeSchema = z.object({
  scope_kind: z.enum(["practice", "exam", "playground"]),
  problem_id: z.string().uuid().nullable().default(null),
  question_id: z.string().uuid().nullable().default(null),
  test_id: z.string().uuid().nullable().default(null),
  attempt_id: z.string().uuid().nullable().default(null),
  language: z.string().max(30).default("python"),
});

const saveSchema = scopeSchema.extend({
  code: z.string().max(60000),
  label: z.enum(["autosave", "manual", "submitted"]).default("autosave"),
});

/** Persists one code snapshot for the signed-in student. */
export const saveSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) throw new Error("No profile linked to this account.");

    let lastQuery = context.supabase
      .from("code_snapshots")
      .select("id, code")
      .eq("student_id", profile.id)
      .eq("scope_kind", data.scope_kind)
      .eq("language", data.language)
      .order("created_at", { ascending: false })
      .limit(1);
    lastQuery = data.problem_id
      ? lastQuery.eq("problem_id", data.problem_id)
      : lastQuery.is("problem_id", null);
    lastQuery = data.question_id
      ? lastQuery.eq("question_id", data.question_id)
      : lastQuery.is("question_id", null);
    lastQuery = data.attempt_id
      ? lastQuery.eq("attempt_id", data.attempt_id)
      : lastQuery.is("attempt_id", null);
    const { data: lastRows } = await lastQuery;
    const last = lastRows?.[0];
    if (last && last.code === data.code) return { id: last.id, skipped: true };

    const { data: row, error } = await context.supabase
      .from("code_snapshots")
      .insert({
        student_id: profile.id,
        scope_kind: data.scope_kind,
        problem_id: data.problem_id,
        question_id: data.question_id,
        test_id: data.test_id,
        attempt_id: data.attempt_id,
        language: data.language,
        code: data.code,
        label: data.label,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, skipped: false };
  });

/** Snapshot history for one problem / exam question, newest first. */
export const listSnapshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scopeSchema.partial({ language: true }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) return [];

    let query = context.supabase
      .from("code_snapshots")
      .select("id, language, code, label, created_at")
      .eq("student_id", profile.id)
      .eq("scope_kind", data.scope_kind)
      .order("created_at", { ascending: false })
      .limit(60);

    query = data.problem_id
      ? query.eq("problem_id", data.problem_id)
      : query.is("problem_id", null);
    query = data.question_id
      ? query.eq("question_id", data.question_id)
      : query.is("question_id", null);
    query = data.attempt_id
      ? query.eq("attempt_id", data.attempt_id)
      : query.is("attempt_id", null);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Most recent snapshot for a scope + language, used to resume work. */
export const latestSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) return null;

    let query = context.supabase
      .from("code_snapshots")
      .select("id, language, code, label, created_at")
      .eq("student_id", profile.id)
      .eq("scope_kind", data.scope_kind)
      .eq("language", data.language)
      .order("created_at", { ascending: false })
      .limit(1);

    query = data.problem_id
      ? query.eq("problem_id", data.problem_id)
      : query.is("problem_id", null);
    query = data.question_id
      ? query.eq("question_id", data.question_id)
      : query.is("question_id", null);
    query = data.attempt_id
      ? query.eq("attempt_id", data.attempt_id)
      : query.is("attempt_id", null);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });
