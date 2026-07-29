import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "create_assessment",
  title: "Schedule an assessment",
  description:
    "Schedule a new CRT assessment. Only trainers and admins are permitted by the database policies.",
  inputSchema: {
    title: z.string().trim().min(3).max(160).describe("Assessment title."),
    kind: z
      .enum(["weekly_test", "mock_nqt", "coding_test", "interview"])
      .describe("Type of assessment."),
    max_marks: z.number().int().min(1).max(500).describe("Maximum marks."),
    scheduled_on: z.string().min(4).max(20).describe("Scheduled date, YYYY-MM-DD."),
    module_id: z.string().uuid().nullable().optional().describe("Optional module this maps to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const { data, error } = await supabaseForUser(ctx)
      .from("assessments")
      .insert({
        title: input.title,
        kind: input.kind,
        max_marks: input.max_marks,
        scheduled_on: input.scheduled_on,
        module_id: input.module_id ?? null,
      })
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return textResult({ assessment: data });
  },
});
