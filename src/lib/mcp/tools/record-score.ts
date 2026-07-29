import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "record_score",
  title: "Record a student score",
  description:
    "Record or update a student's marks for an assessment. Only trainers and admins are permitted by the database policies.",
  inputSchema: {
    student_id: z.string().uuid().describe("Student user id."),
    assessment_id: z.string().uuid().describe("Assessment id."),
    marks: z.number().min(0).max(500).describe("Marks obtained."),
    attempts: z.number().int().min(1).max(10).optional().describe("Attempt number (default 1)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const { data, error } = await supabaseForUser(ctx)
      .from("scores")
      .upsert(
        {
          student_id: input.student_id,
          assessment_id: input.assessment_id,
          marks: input.marks,
          attempts: input.attempts ?? 1,
        },
        { onConflict: "student_id,assessment_id" },
      )
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return textResult({ score: data });
  },
});
