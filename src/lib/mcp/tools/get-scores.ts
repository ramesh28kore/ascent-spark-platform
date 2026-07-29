import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_scores",
  title: "Get assessment scores",
  description:
    "Get assessment scores. Students see their own marks; trainers, admins and the placement cell can filter by student_id.",
  inputSchema: {
    student_id: z.string().uuid().optional().describe("Optional student profile user id to filter by."),
    limit: z.number().int().min(1).max(500).optional().describe("Max rows to return (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    let query = supabaseForUser(ctx).from("scores").select("*").limit(limit ?? 100);
    if (student_id) query = query.eq("student_id", student_id);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ scores: data ?? [] });
  },
});
