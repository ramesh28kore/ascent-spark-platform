import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_students",
  title: "List students",
  description:
    "List student profiles visible to the signed-in user. Trainers, admins and the placement cell see the whole batch; students see only themselves.",
  inputSchema: {
    search: z.string().trim().max(100).optional().describe("Optional name or roll-number filter."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    let query = supabaseForUser(ctx)
      .from("profiles")
      .select("*")
      .order("roll_number", { nullsFirst: false })
      .limit(limit ?? 50);
    if (search) query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ students: data ?? [] });
  },
});
