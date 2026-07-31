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
      .select("id, prompt, marks, test_cases")
      .eq("id", data.question_id)
      .maybeSingle();
    if (!question) throw new Error("Question not found.");

    const marks = item.marks ?? question.marks ?? 1;
    const cases = parseTestCases(question.test_cases);

    let score = 0;
    let verdict = "pending";
    let feedback = "";
    let status: "graded" | "pending_review" = "graded";

    const provisional =
      data.cases_total > 0 ? clampScore((data.cases_passed / data.cases_total) * marks, marks) : 0;

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
        clientPassed: data.cases_passed,
        clientTotal: data.cases_total,
      });

      try {
        const { output } = await generateText({
          model: gateway("google/gemini-3.6-flash"),
          output: Output.object({ schema: gradeOutputSchema }),
          prompt,
        });
        score = clampScore(output.score, marks);
        verdict = String(output.verdict || "graded").slice(0, 40);
        feedback = String(output.feedback || "").slice(0, 1000);
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error) && error.text) {
          const match = error.text.match(/\{[\s\S]*\}/);
          const fallback = match ? gradeOutputSchema.safeParse(JSON.parse(match[0])) : null;
          if (fallback?.success) {
            score = clampScore(fallback.data.score, marks);
            verdict = fallback.data.verdict.slice(0, 40);
            feedback = fallback.data.feedback.slice(0, 1000);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      // Never zero a student out on an AI failure — record for trainer review.
      status = "pending_review";
      score = provisional;
      verdict = "pending review";
      feedback =
        "Automatic review is temporarily unavailable, so a provisional score from your test-case run was recorded. Your trainer will confirm it.";
      console.error("coding grading failed", error);
    }

    const { error: insertError } = await supabase.from("coding_submissions").insert({
      test_id: data.test_id,
      question_id: data.question_id,
      student_id: profile.id,
      code: data.code,
      language: data.language,
      cases_passed: data.cases_passed,
      cases_total: data.cases_total,
      ai_score: score,
      max_score: marks,
      verdict,
      feedback,
      status,
    });
    if (insertError) throw new Error(insertError.message);

    return { score, max_score: marks, verdict, feedback, status };
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
