import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rowSchema = z.record(z.string(), z.string().max(8000));

const inputSchema = z.object({
  dataset: z.enum([
    "students",
    "modules",
    "topics",
    "assessments",
    "questions",
    "coding",
    "scores",
    "batches",
    "sessions",
    "attendance",
  ]),

  rows: z.array(rowSchema).min(1).max(500),
});

type Row = Record<string, string>;

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown, fallback = 0) => {
  const n = Number(clean(v));
  return Number.isFinite(n) ? n : fallback;
};
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => {
  const s = clean(v).toLowerCase().replace(/\s+/g, "_") as T;
  return allowed.includes(s) ? s : fallback;
};

export const bulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "trainer")) {
      throw new Error("Only trainers can bulk import data.");
    }

    const rows = data.rows as Row[];
    const errors: { row: number; message: string }[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const modulesByCode = new Map<string, string>();
    if (["topics", "assessments", "questions", "coding", "modules"].includes(data.dataset)) {
      const { data: mods } = await supabase.from("modules").select("id, code");
      (mods ?? []).forEach((m) => modulesByCode.set(m.code.toLowerCase(), m.id));
    }

    const fail = (i: number, message: string) => {
      errors.push({ row: i + 2, message });
      skipped += 1;
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (data.dataset === "students") {
          const full_name = clean(r.full_name);
          if (!full_name) {
            fail(i, "full_name is required");
            continue;
          }
          const payload = {
            full_name: full_name.slice(0, 120),
            roll_number: clean(r.roll_number).slice(0, 40) || null,
            email: clean(r.email).slice(0, 160) || null,
            branch: clean(r.branch).slice(0, 60) || null,
            year: clean(r.year).slice(0, 20) || null,
            batch: clean(r.batch).slice(0, 60) || null,
          };
          let existingId: string | null = null;
          if (payload.roll_number) {
            const { data: ex } = await supabase
              .from("profiles")
              .select("id")
              .eq("roll_number", payload.roll_number)
              .maybeSingle();
            existingId = ex?.id ?? null;
          }
          if (!existingId && payload.email) {
            const { data: ex } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", payload.email)
              .maybeSingle();
            existingId = ex?.id ?? null;
          }
          if (existingId) {
            const { error } = await supabase.from("profiles").update(payload).eq("id", existingId);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("profiles").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "modules") {
          const code = clean(r.code).slice(0, 20);
          const title = clean(r.title).slice(0, 160);
          if (!code || !title) {
            fail(i, "code and title are required");
            continue;
          }
          const payload = {
            code,
            title,
            description: clean(r.description).slice(0, 1000) || null,
            hours: Math.round(num(r.hours)),
            weight_percent: Math.round(num(r.weight_percent)),
            deliverable: clean(r.deliverable).slice(0, 300) || null,
            sort_order: Math.round(num(r.sort_order, i + 1)),
          };
          const existing = modulesByCode.get(code.toLowerCase());
          if (existing) {
            const { error } = await supabase.from("modules").update(payload).eq("id", existing);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { data: ins, error } = await supabase
              .from("modules")
              .insert(payload)
              .select("id, code")
              .single();
            if (error) throw new Error(error.message);
            modulesByCode.set(ins.code.toLowerCase(), ins.id);
            inserted += 1;
          }
        } else if (data.dataset === "topics") {
          const moduleId = modulesByCode.get(clean(r.module_code).toLowerCase());
          const title = clean(r.title).slice(0, 200);
          if (!moduleId) {
            fail(i, `unknown module_code "${clean(r.module_code)}"`);
            continue;
          }
          if (!title) {
            fail(i, "title is required");
            continue;
          }
          const { data: ex } = await supabase
            .from("module_topics")
            .select("id")
            .eq("module_id", moduleId)
            .eq("title", title)
            .maybeSingle();
          const payload = {
            module_id: moduleId,
            title,
            hours: num(r.hours, 1),
            sort_order: Math.round(num(r.sort_order, i + 1)),
          };
          if (ex?.id) {
            const { error } = await supabase.from("module_topics").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("module_topics").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "assessments") {
          const title = clean(r.title).slice(0, 160);
          if (!title) {
            fail(i, "title is required");
            continue;
          }
          const payload = {
            title,
            kind: pick(
              r.kind,
              ["weekly_test", "mock_nqt", "coding_test", "interview"] as const,
              "weekly_test",
            ),
            module_id: modulesByCode.get(clean(r.module_code).toLowerCase()) ?? null,
            max_marks: Math.max(1, Math.round(num(r.max_marks, 30))),
            scheduled_on: /^\d{4}-\d{2}-\d{2}$/.test(clean(r.scheduled_on))
              ? clean(r.scheduled_on)
              : new Date().toISOString().slice(0, 10),
          };
          const { data: ex } = await supabase
            .from("assessments")
            .select("id")
            .eq("title", title)
            .maybeSingle();
          if (ex?.id) {
            const { error } = await supabase.from("assessments").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("assessments").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "questions") {
          const prompt = clean(r.prompt).slice(0, 2000);
          if (!prompt) {
            fail(i, "prompt is required");
            continue;
          }
          const payload = {
            prompt,
            module_id: modulesByCode.get(clean(r.module_code).toLowerCase()) ?? null,
            qtype: pick(r.qtype, ["mcq", "coding", "descriptive"] as const, "mcq"),
            options: clean(r.options)
              ? clean(r.options)
                  .split("|")
                  .map((o) => o.trim().slice(0, 300))
                  .filter(Boolean)
                  .slice(0, 6)
              : [],
            answer: clean(r.answer).slice(0, 500) || null,
            explanation: clean(r.explanation).slice(0, 1000) || null,
            level: pick(r.level, ["easy", "medium", "hard"] as const, "easy"),
            bloom: (["L1", "L2", "L3", "L4", "L5", "L6"] as const).includes(
              clean(r.bloom).toUpperCase() as "L1",
            )
              ? clean(r.bloom).toUpperCase()
              : "L1",
            marks: Math.max(1, Math.round(num(r.marks, 1))),
          };
          const { error } = await supabase.from("questions").insert(payload);
          if (error) throw new Error(error.message);
          inserted += 1;
        } else if (data.dataset === "coding") {
          const title = clean(r.title).slice(0, 160);
          const problem = clean(r.problem).slice(0, 3000);
          if (!title || !problem) {
            fail(i, "title and problem are required");
            continue;
          }
          const payload = {
            title,
            module_id: modulesByCode.get(clean(r.module_code).toLowerCase()) ?? null,
            pattern: clean(r.pattern).slice(0, 80) || null,
            level: pick(r.level, ["easy", "medium", "hard"] as const, "easy"),
            problem,
            approach: clean(r.approach).slice(0, 3000) || "—",
            code: clean(r.code).slice(0, 8000) || "—",
            expected_output: clean(r.expected_output).slice(0, 3000) || null,
            complexity: clean(r.complexity).slice(0, 200) || null,
            follow_ups: clean(r.follow_ups).slice(0, 1000) || null,
          };
          const { data: ex } = await supabase
            .from("coding_problems")
            .select("id")
            .eq("title", title)
            .maybeSingle();
          if (ex?.id) {
            const { error } = await supabase.from("coding_problems").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("coding_problems").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "batches") {
          const name = clean(r.name);
          if (!name) {
            fail(i, "name is required");
            continue;
          }
          const payload = {
            name: name.slice(0, 60),
            academic_year: clean(r.academic_year).slice(0, 20) || "2025-26",
            branch: clean(r.branch).slice(0, 60) || null,
            active: clean(r.active).toLowerCase() !== "false",
          };
          const { data: ex } = await supabase
            .from("batches")
            .select("id")
            .eq("name", payload.name)
            .maybeSingle();
          if (ex?.id) {
            const { error } = await supabase.from("batches").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("batches").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "sessions") {
          const title = clean(r.title);
          const when = clean(r.scheduled_at);
          if (!title || !when) {
            fail(i, "title and scheduled_at are required");
            continue;
          }
          const iso = new Date(when).toISOString();
          const batchName = clean(r.batch);
          let batchId: string | null = null;
          if (batchName) {
            const { data: b } = await supabase
              .from("batches")
              .select("id")
              .eq("name", batchName)
              .maybeSingle();
            if (!b?.id) {
              fail(i, `no batch named "${batchName}"`);
              continue;
            }
            batchId = b.id;
          }
          const payload = {
            title: title.slice(0, 160),
            batch_id: batchId,
            module_id: modulesByCode.get(clean(r.module_code).toLowerCase()) ?? null,
            trainer_name: clean(r.trainer_name).slice(0, 120) || null,
            scheduled_at: iso,
            duration_min: Math.max(15, Math.round(num(r.duration_min, 90))),
            status: pick(r.status, ["planned", "conducted", "cancelled"] as const, "planned"),
          };
          const { data: ex } = await supabase
            .from("sessions")
            .select("id")
            .eq("title", payload.title)
            .eq("scheduled_at", iso)
            .maybeSingle();
          if (ex?.id) {
            const { error } = await supabase.from("sessions").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("sessions").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        } else if (data.dataset === "attendance") {
          const roll = clean(r.roll_number);
          const title = clean(r.session_title);
          const when = clean(r.scheduled_at);
          const { data: student } = await supabase
            .from("profiles")
            .select("id")
            .eq("roll_number", roll)
            .maybeSingle();
          if (!student?.id) {
            fail(i, `no student with roll_number "${roll}"`);
            continue;
          }
          let sessionQuery = supabase.from("sessions").select("id").eq("title", title);
          if (when) sessionQuery = sessionQuery.eq("scheduled_at", new Date(when).toISOString());
          const { data: session } = await sessionQuery.maybeSingle();
          if (!session?.id) {
            fail(i, `no session titled "${title}"`);
            continue;
          }
          const present = !["false", "0", "absent", "no"].includes(clean(r.present).toLowerCase());
          const { error } = await supabase
            .from("attendance")
            .upsert(
              { session_id: session.id, student_id: student.id, present },
              { onConflict: "session_id,student_id" },
            );
          if (error) throw new Error(error.message);
          inserted += 1;
        } else {

          const roll = clean(r.roll_number);
          const title = clean(r.assessment_title);
          const { data: student } = await supabase
            .from("profiles")
            .select("id")
            .eq("roll_number", roll)
            .maybeSingle();
          if (!student?.id) {
            fail(i, `no student with roll_number "${roll}"`);
            continue;
          }
          const { data: assessment } = await supabase
            .from("assessments")
            .select("id, max_marks")
            .eq("title", title)
            .maybeSingle();
          if (!assessment?.id) {
            fail(i, `no assessment titled "${title}"`);
            continue;
          }
          const marks = Math.min(Math.max(num(r.marks), 0), assessment.max_marks);
          const { data: ex } = await supabase
            .from("scores")
            .select("id")
            .eq("student_id", student.id)
            .eq("assessment_id", assessment.id)
            .maybeSingle();
          const payload = {
            student_id: student.id,
            assessment_id: assessment.id,
            marks,
            attempts: Math.max(1, Math.round(num(r.attempts, 1))),
          };
          if (ex?.id) {
            const { error } = await supabase.from("scores").update(payload).eq("id", ex.id);
            if (error) throw new Error(error.message);
            updated += 1;
          } else {
            const { error } = await supabase.from("scores").insert(payload);
            if (error) throw new Error(error.message);
            inserted += 1;
          }
        }
      } catch (e) {
        fail(i, e instanceof Error ? e.message : "unknown error");
      }
    }

    return { inserted, updated, skipped, errors: errors.slice(0, 25), total: rows.length };
  });
