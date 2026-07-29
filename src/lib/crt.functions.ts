import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleList = (roles ?? []).map((r) => r.role as string);
    const isAdmin = roleList.includes("admin");
    const isPlacement = roleList.includes("placement");
    const isTrainerRole = roleList.includes("trainer");
    return {
      profile: profile ?? null,
      isTrainer: isTrainerRole || isAdmin,
      isAdmin,
      isPlacement,
      isStaff: isTrainerRole || isAdmin,
      canViewAll: isTrainerRole || isAdmin || isPlacement,
      isStudent: roleList.includes("student"),
      roleLabel: isAdmin
        ? "Admin"
        : isTrainerRole
          ? "Trainer"
          : isPlacement
            ? "Placement cell"
            : "Student",
      roles: roleList,
    };
  });


export const getModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: modules }, { data: topics }] = await Promise.all([
      context.supabase.from("modules").select("*").order("sort_order"),
      context.supabase.from("module_topics").select("*").order("sort_order"),
    ]);
    return { modules: modules ?? [], topics: topics ?? [] };
  });

export const setTopicCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("module_topics")
      .update({ completed: data.completed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .order("roll_number", { nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select("*")
      .order("scheduled_on");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("scores").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(160),
        kind: z.enum(["weekly_test", "mock_nqt", "coding_test", "interview"]),
        module_id: z.string().uuid().nullable(),
        max_marks: z.number().int().min(1).max(500),
        scheduled_on: z.string().min(4).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assessments").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        assessment_id: z.string().uuid(),
        marks: z.number().min(0).max(500),
        attempts: z.number().int().min(1).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scores")
      .upsert(data, { onConflict: "student_id,assessment_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const STUDENT_QUESTION_COLS =
  "id, module_id, prompt, qtype, options, level, bloom, marks, created_at";

export const getQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff get the full row (answer + explanation) through a secured helper.
    const staff = await context.supabase.rpc("staff_questions");
    if (!staff.error && (staff.data?.length ?? 0) > 0) {
      return [...staff.data].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    // Students may only read the answer-free columns.
    const { data, error } = await context.supabase
      .from("questions")
      .select(STUDENT_QUESTION_COLS)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((q) => ({ ...q, answer: null, explanation: null }));
  });


export const createQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        module_id: z.string().uuid().nullable(),
        prompt: z.string().trim().min(5).max(2000),
        qtype: z.enum(["mcq", "coding", "descriptive"]),
        options: z.array(z.string().max(300)).max(6),
        answer: z.string().trim().max(500),
        explanation: z.string().trim().max(1000),
        level: z.enum(["easy", "medium", "hard"]),
        bloom: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"]),
        marks: z.number().int().min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("questions").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const STUDENT_CODING_COLS =
  "id, module_id, title, pattern, level, problem, complexity, follow_ups, created_at";

export const getCodingProblems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff see the model solution; students do not.
    const staff = await context.supabase.rpc("staff_coding_problems");
    if (!staff.error && (staff.data?.length ?? 0) > 0) {
      return [...staff.data].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    const { data, error } = await context.supabase
      .from("coding_problems")
      .select(STUDENT_CODING_COLS)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      ...p,
      approach: "",
      code: "",
      expected_output: null,
    }));
  });


export const createCodingProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        module_id: z.string().uuid().nullable(),
        title: z.string().trim().min(3).max(160),
        pattern: z.string().trim().max(80),
        level: z.enum(["easy", "medium", "hard"]),
        problem: z.string().trim().min(5).max(3000),
        approach: z.string().trim().min(5).max(3000),
        code: z.string().trim().min(5).max(8000),
        expected_output: z.string().trim().max(3000),
        complexity: z.string().trim().max(200),
        follow_ups: z.string().trim().max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("coding_problems").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
