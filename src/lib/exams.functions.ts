import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ExamKind = Database["public"]["Enums"]["exam_kind"];

const examKind = z.enum(["mcq_quiz", "theory", "programming", "debugging", "challenge", "viva"]);

async function profileOf(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("No profile linked to this account.");
  return data.id;
}


/* ------------------------------------------------------------------ theory */

export const saveTheoryAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        test_id: z.string().uuid(),
        question_id: z.string().uuid(),
        answer: z.string().trim().min(1, { message: "write your answer before submitting" }).max(20000),
        max_marks: z.number().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const studentId = await profileOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("theory_answers").upsert(
      {
        test_id: data.test_id,
        question_id: data.question_id,
        student_id: studentId,
        answer: data.answer,
        max_marks: data.max_marks,
      },
      { onConflict: "test_id,question_id,student_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Descriptive answers awaiting a human evaluator. */
export const listPendingTheory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("theory_answers")
      .select(
        "id, answer, awarded, comment, max_marks, evaluated_at, created_at, question_id, test_id, student_id",
      )
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const evaluateTheoryAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        awarded: z.number().min(0).max(100),
        comment: z.string().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("theory_answers")
      .update({
        awarded: data.awarded,
        comment: data.comment,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ rubrics */

export const listRubrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("rubrics").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertRubric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(3, { message: "the rubric name needs at least 3 characters" }),
        kind: examKind,
        criteria: z
          .array(z.object({ label: z.string().min(1), max: z.number().min(1).max(100) }))
          .min(1, { message: "add at least one criterion" }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const max_marks = data.criteria.reduce((sum, criterion) => sum + criterion.max, 0);
    const payload = {
      name: data.name,
      kind: data.kind as ExamKind,
      criteria: data.criteria as never,
      max_marks,
    };
    const query = data.id
      ? context.supabase.from("rubrics").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("rubrics").insert(payload).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const saveRubricScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        rubric_id: z.string().uuid(),
        test_id: z.string().uuid().nullable().default(null),
        assessment_id: z.string().uuid().nullable().default(null),
        kind: examKind,
        scores: z.record(z.string(), z.number().min(0).max(100)),
        comments: z.string().max(2000).default(""),
        released: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rubric } = await context.supabase
      .from("rubrics")
      .select("max_marks")
      .eq("id", data.rubric_id)
      .maybeSingle();
    const total = Object.values(data.scores).reduce((sum, value) => sum + value, 0);

    const { error } = await context.supabase.from("rubric_scores").insert({
      student_id: data.student_id,
      rubric_id: data.rubric_id,
      test_id: data.test_id,
      assessment_id: data.assessment_id,
      kind: data.kind as ExamKind,
      scores: data.scores as never,
      comments: data.comments,
      released: data.released,
      total,
      max_total: rubric?.max_marks ?? total,
    });
    if (error) throw new Error(error.message);
    return { total, max_total: rubric?.max_marks ?? total };
  });

export const listRubricScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rubric_scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* -------------------------------------------------------------- leaderboard */

export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("test_leaderboard", {
      _test_id: data.test_id,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ------------------------------------------------------------- certificates */

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("certificates")
      .select("*")
      .order("issued_on", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        title: z.string().trim().min(3, { message: "the certificate title needs at least 3 characters" }),
        kind: z.string().trim().min(2).default("completion"),
        module_id: z.string().uuid().nullable().default(null),
        score: z.number().min(0),
        max_score: z.number().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: student } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.student_id)
      .maybeSingle();
    if (!student) throw new Error("Student not found.");

    const code = `CRT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: row, error } = await context.supabase
      .from("certificates")
      .insert({
        student_id: data.student_id,
        holder_name: student.full_name,
        title: data.title,
        kind: data.kind,
        module_id: data.module_id,
        score: data.score,
        max_score: data.max_score,
        code,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Public verification — no session required. Runs server-side against one exact code
 *  and returns only non-sensitive fields; the certificates table itself is never
 *  readable by anonymous clients. */
export const verifyCertificate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(4).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,60}$/.test(code)) return { valid: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("certificates")
      .select("code, holder_name, title, kind, score, max_score, issued_on")
      .eq("code", code)
      .maybeSingle();

    return row ? { valid: true as const, certificate: row } : { valid: false as const };
  });


/* ---------------------------------------------------------------- analytics */

/** Aggregated performance data for the staff analytics dashboard. */
export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [attempts, submissions, scores, assessments, modules, questions, attendance] =
      await Promise.all([
        context.supabase
          .from("test_attempts")
          .select("id, test_id, student_id, score, max_score, submitted_at, blur_count"),
        context.supabase
          .from("coding_submissions")
          .select("id, question_id, student_id, ai_score, max_score, verdict, judged_by, runtime_ms, created_at"),
        context.supabase.from("scores").select("id, student_id, assessment_id, marks"),
        context.supabase.from("assessments").select("id, title, kind, module_id, max_marks"),
        context.supabase.from("modules").select("id, code, title"),
        context.supabase.from("questions").select("id, module_id, level"),
        context.supabase.from("attendance").select("id, student_id, present, marked_at"),
      ]);

    const moduleRows = modules.data ?? [];
    const questionRows = questions.data ?? [];
    const submissionRows = submissions.data ?? [];
    const assessmentRows = assessments.data ?? [];
    const scoreRows = scores.data ?? [];

    const moduleOfQuestion = new Map(questionRows.map((q) => [q.id, q.module_id]));

    // Weakest modules, measured on coding submissions and assessment scores together.
    const perModule = new Map<string, { earned: number; possible: number }>();
    const bump = (moduleId: string | null, earned: number, possible: number) => {
      if (!moduleId || possible <= 0) return;
      const current = perModule.get(moduleId) ?? { earned: 0, possible: 0 };
      perModule.set(moduleId, {
        earned: current.earned + earned,
        possible: current.possible + possible,
      });
    };

    for (const row of submissionRows) {
      bump(moduleOfQuestion.get(row.question_id) ?? null, Number(row.ai_score), Number(row.max_score));
    }
    const assessmentById = new Map(assessmentRows.map((a) => [a.id, a]));
    for (const row of scoreRows) {
      const assessment = assessmentById.get(row.assessment_id);
      if (assessment) bump(assessment.module_id, Number(row.marks), Number(assessment.max_marks));
    }

    const moduleAttainment = moduleRows
      .map((module) => {
        const agg = perModule.get(module.id);
        return {
          module_id: module.id,
          code: module.code,
          title: module.title,
          percent: agg && agg.possible > 0 ? Math.round((agg.earned / agg.possible) * 100) : null,
          samples: agg ? 1 : 0,
        };
      })
      .filter((row) => row.percent !== null)
      .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));

    // Score distribution across submitted attempts.
    const bands = [0, 0, 0, 0, 0];
    let flagged = 0;
    for (const attempt of attempts.data ?? []) {
      if (!attempt.submitted_at) continue;
      const percent = (Number(attempt.score) / Math.max(1, Number(attempt.max_score))) * 100;
      bands[Math.min(4, Math.floor(percent / 20))] += 1;
      if ((attempt.blur_count ?? 0) >= 3) flagged += 1;
    }

    // Daily activity heatmap over the last 8 weeks.
    const activity = new Map<string, number>();
    for (const row of submissionRows) {
      const day = row.created_at.slice(0, 10);
      activity.set(day, (activity.get(day) ?? 0) + 1);
    }

    const attendanceRows = attendance.data ?? [];
    const present = attendanceRows.filter((row) => row.present).length;

    return {
      moduleAttainment,
      distribution: [
        { band: "0-20%", count: bands[0] },
        { band: "21-40%", count: bands[1] },
        { band: "41-60%", count: bands[2] },
        { band: "61-80%", count: bands[3] },
        { band: "81-100%", count: bands[4] },
      ],
      totals: {
        attempts: (attempts.data ?? []).filter((a) => a.submitted_at).length,
        submissions: submissionRows.length,
        accepted: submissionRows.filter((s) => s.verdict === "accepted").length,
        sandboxJudged: submissionRows.filter((s) => s.judged_by === "sandbox").length,
        flaggedAttempts: flagged,
        attendancePercent:
          attendanceRows.length > 0 ? Math.round((present / attendanceRows.length) * 100) : null,
      },
      activity: Array.from(activity.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-56),
    };
  });

/* ------------------------------------------------------- export reporting */

/**
 * Row-level dataset backing the analytics Export Centre.
 * Staff read the whole batch; a student only ever sees their own rows via RLS.
 */
export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [
      students,
      batches,
      modules,
      assessments,
      scores,
      attempts,
      tests,
      submissions,
      questions,
      attendance,
      sessions,
      practiceProblems,
      practiceProgress,
      mocks,
    ] = await Promise.all([
      s.from("profiles").select("id, full_name, roll_number, branch, year, batch, batch_id, email"),
      s.from("batches").select("id, name, academic_year, branch, active"),
      s.from("modules").select("id, code, title, weight_percent, hours, sort_order"),
      s.from("assessments").select("id, title, kind, module_id, max_marks, scheduled_on"),
      s.from("scores").select("id, student_id, assessment_id, marks, attempts, recorded_at"),
      s
        .from("test_attempts")
        .select("id, test_id, student_id, score, max_score, submitted_at, started_at, blur_count"),
      s.from("tests").select("id, title, module_id, batch_id, exam_kind, starts_at"),
      s
        .from("coding_submissions")
        .select("id, question_id, student_id, ai_score, max_score, verdict, created_at"),
      s.from("questions").select("id, module_id, level"),
      s.from("attendance").select("id, session_id, student_id, present, marked_at"),
      s.from("sessions").select("id, batch_id, module_id, scheduled_at"),
      s.from("practice_problems").select("id, points, module_id"),
      s.from("practice_progress").select("student_id, problem_id, status, updated_at"),
      s.from("mock_interviews").select("student_id, rating, held_on"),
    ]);

    return {
      students: students.data ?? [],
      batches: batches.data ?? [],
      modules: modules.data ?? [],
      assessments: assessments.data ?? [],
      scores: scores.data ?? [],
      attempts: attempts.data ?? [],
      tests: tests.data ?? [],
      submissions: submissions.data ?? [],
      questions: questions.data ?? [],
      attendance: attendance.data ?? [],
      sessions: sessions.data ?? [],
      practiceProblems: practiceProblems.data ?? [],
      practiceProgress: practiceProgress.data ?? [],
      mocks: mocks.data ?? [],
    };
  });
