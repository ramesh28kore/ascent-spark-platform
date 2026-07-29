import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_assessments",
  title: "List assessments",
  description: "List scheduled CRT assessments (weekly tests, mock NQT, coding tests, interviews).",
  inputSchema: {
    kind: z
      .enum(["weekly_test", "mock_nqt", "coding_test", "interview"])
      .optional()
      .describe("Optional assessment kind filter."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    let query = supabaseForUser(ctx)
      .from("assessments")
      .select("*")
      .order("scheduled_on")
      .limit(limit ?? 50);
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ assessments: data ?? [] });
  },
});
