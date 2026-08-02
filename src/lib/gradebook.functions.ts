/** Staff-only data feed for the trainer gradebook downloads. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { GradebookData } from "@/lib/gradebook";

export const getGradebookData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GradebookData & { batches: { id: string; name: string }[]; modules: { id: string; code: string }[] }> => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const staff = (roles ?? []).some((r) => r.role === "trainer" || r.role === "placement");
    if (!staff) throw new Error("Only trainers can open the gradebook.");

    const [{ data: students }, { data: problems }, { data: submissions }, { data: batches }, { data: modules }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, roll_number, batch_id, batches:batch_id (name)")
          .order("roll_number"),
        supabase
          .from("practice_problems")
          .select("id, title, level, points, module_id, modules:module_id (code)")
          .eq("status", "published")
          .order("sort_order"),
        supabase
          .from("problem_submissions")
          .select("student_id, problem_id, verdict, runtime_ms, cases_passed, cases_total, created_at")
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase.from("batches").select("id, name").order("name"),
        supabase.from("modules").select("id, code").order("sort_order"),
      ]);

    return {
      students: (students ?? []).map((s) => ({
        id: s.id,
        full_name: s.full_name,
        roll_number: s.roll_number,
        batch_id: s.batch_id,
        batch_name: (s.batches as { name?: string } | null)?.name ?? null,
      })),
      problems: (problems ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        level: p.level,
        points: p.points ?? 0,
        module_id: p.module_id,
        module_code: (p.modules as { code?: string } | null)?.code ?? null,
      })),
      submissions: (submissions ?? []).map((s) => ({
        student_id: s.student_id,
        problem_id: s.problem_id,
        verdict: s.verdict,
        runtime_ms: s.runtime_ms ?? 0,
        cases_passed: s.cases_passed ?? 0,
        cases_total: s.cases_total ?? 0,
        created_at: s.created_at,
      })),
      batches: (batches ?? []).map((b) => ({ id: b.id, name: b.name })),
      modules: (modules ?? []).map((m) => ({ id: m.id, code: m.code })),
    };
  });
