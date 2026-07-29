import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_modules",
  title: "List syllabus modules",
  description: "List the CRT curriculum modules and their topics, with completion state.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const supabase = supabaseForUser(ctx);
    const [{ data: modules, error }, { data: topics }] = await Promise.all([
      supabase.from("modules").select("*").order("sort_order"),
      supabase.from("module_topics").select("*").order("sort_order"),
    ]);
    if (error) return errorResult(error.message);
    return textResult({ modules: modules ?? [], topics: topics ?? [] });
  },
});
