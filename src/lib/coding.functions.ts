import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  buildGradingPrompt,
  clampScore,
  codingSubmitSchema,
  gradeOutputSchema,
  parseTestCases,
} from "@/lib/coding-grade.server";

export const gradeCodingSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => codingSubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("No student profile linked to this account.");

    const { data: test } = await supabase
      .from("tests")
      .select("id, published, ends_at, duration_min")
      .eq("id", data.test_id)
      .maybeSingle();
    if (!test?.published) throw new Error("Test not found or not published.");
    if (test.ends_at && new Date(test.ends_at).getTime() < Date.now())
      throw new Error("The test window has closed.");

    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("started_at, submitted_at")
      .eq("test_id", data.test_id)
      .eq("student_id", profile.id)
      .maybeSingle();
    if (!attempt) throw new Error("Start the test before submitting an answer.");
    if (attempt.submitted_at) throw new Error("This attempt has already been submitted.");
    const deadline =
      new Date(attempt.started_at).getTime() + test.duration_min * 60_000 + 10_000;
    if (Date.now() > deadline) throw new Error("Time limit exceeded.");

    const { data: item } = await supabase
      .from("test_items")
      .select("marks, question_id")
      .eq("test_id", data.test_id)
      .eq("question_id", data.question_id)
      .maybeSingle();
    if (!item) throw new Error("That question is not part of this test.");

    const { data: existing } = await supabase
      .from("coding_submissions")
      .select("id")
      .eq("test_id", data.test_id)
      .eq("question_id", data.question_id)
      .eq("student_id", profile.id)
      .maybeSingle();
    if (existing) throw new Error("You have already submitted this question.");

    const { data: question } = await supabase
      .from("questions")
      .select("id, prompt, marks, test_cases, time_limit_ms, memory_limit_kb")
      .eq("id", data.question_id)
      .maybeSingle();
    if (!question) throw new Error("Question not found.");

    const marks = item.marks ?? question.marks ?? 1;
    const cases = parseTestCases(question.test_cases);

    let score = 0;
    let verdict = "pending";
    let feedback = "";
    let status: "graded" | "pending_review" = "graded";
    let judged_by = "ai";
    let runtime_ms = 0;
    let memory_kb = 0;
    let casesPassed = data.cases_passed;
    let casesTotal = data.cases_total;
    let caseResults: unknown[] = [];

    // 1) Authoritative judging: run every case (including hidden) in the sandbox.
    if (cases.length > 0) {
      const { judgeAgainstCases } = await import("@/lib/judge.server");
      const judged = await judgeAgainstCases({
        language: data.language === "python" ? "python" : "javascript",
        code: data.code,
        cases,
        timeoutMs: question.time_limit_ms ?? 5000,
        memoryKb: question.memory_limit_kb ?? 128000,
      });
      const sandboxUnavailable = judged.unreachable;

      if (!sandboxUnavailable) {
        judged_by = "sandbox";
        casesPassed = judged.passed;
        casesTotal = judged.total;
        runtime_ms = judged.runtime_ms;
        memory_kb = judged.memory_kb;
        score = clampScore((judged.passed / Math.max(1, judged.total)) * marks, marks);
        verdict =
          judged.passed === judged.total
            ? "accepted"
            : judged.passed === 0
              ? "wrong answer"
              : "partial";
        // Never leak hidden expectations back to the student.
        caseResults = judged.results.map((r) =>
          r.hidden
            ? { index: r.index, hidden: true, passed: r.passed, runtime_ms: r.runtime_ms }
            : r,
        );
      }
    }

    // 2) AI review: feedback always, and the score itself when there are no test cases.
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

      const [{ generateText, Output, NoObjectGeneratedError }, { createLovableAiGatewayProvider }] =
        await Promise.all([import("ai"), import("@/lib/ai-gateway.server")]);

      const gateway = createLovableAiGatewayProvider(apiKey);
      const prompt = buildGradingPrompt({
        prompt: question.prompt,
        marks,
        language: data.language,
        code: data.code,
        cases,
        clientPassed: casesPassed,
        clientTotal: casesTotal,
      });

      const applyAi = (out: { score: number; verdict: string; feedback: string }) => {
        feedback = String(out.feedback || "").slice(0, 1000);
        if (judged_by !== "sandbox") {
          score = clampScore(out.score, marks);
          verdict = String(out.verdict || "graded").slice(0, 40);
        }
      };

      try {
        const { output } = await generateText({
          model: gateway("google/gemini-3.6-flash"),
          output: Output.object({ schema: gradeOutputSchema }),
          prompt,
        });
        applyAi(output);
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error) && error.text) {
          const match = error.text.match(/\{[\s\S]*\}/);
          const fallback = match ? gradeOutputSchema.safeParse(JSON.parse(match[0])) : null;
          if (fallback?.success) applyAi(fallback.data);
          else throw error;
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("coding AI review failed", error);
      if (judged_by === "sandbox") {
        feedback = `Scored from ${casesPassed}/${casesTotal} sandbox test case(s). Written feedback is unavailable right now.`;
      } else {
        // Never zero a student out on an infrastructure failure.
        status = "pending_review";
        score =
          data.cases_total > 0
            ? clampScore((data.cases_passed / data.cases_total) * marks, marks)
            : 0;
        verdict = "pending review";
        feedback =
          "Automatic evaluation is temporarily unavailable, so a provisional score was recorded. Your trainer will confirm it.";
      }
    }

    const { error: insertError } = await supabase.from("coding_submissions").insert({
      test_id: data.test_id,
      question_id: data.question_id,
      student_id: profile.id,
      code: data.code,
      language: data.language,
      cases_passed: casesPassed,
      cases_total: casesTotal,
      ai_score: score,
      max_score: marks,
      verdict,
      feedback,
      status,
      judged_by,
      runtime_ms,
      memory_kb,
      case_results: caseResults as never,
    });
    if (insertError) throw new Error(insertError.message);

    return {
      score,
      max_score: marks,
      verdict,
      feedback,
      status,
      judged_by,
      runtime_ms,
      memory_kb,
      cases_passed: casesPassed,
      cases_total: casesTotal,
      case_results: caseResults,
    };

  });


export const getCodingSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ test_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("coding_submissions")
      .select("*")
      .eq("test_id", data.test_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const overrideCodingScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        ai_score: z.number().min(0).max(100),
        feedback: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coding_submissions")
      .update({
        ai_score: data.ai_score,
        status: "graded",
        verdict: "trainer reviewed",
        ...(data.feedback ? { feedback: data.feedback } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
