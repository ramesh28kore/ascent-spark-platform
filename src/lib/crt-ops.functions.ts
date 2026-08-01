import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  batchSchema,
  sessionSchema,
  attendanceSchema,
  roleSchema,
  mockSchema,
  practiceProblemSchema,
  practiceStatusSchema,
  resourceSchema,
  studentBatchSchema,
} from "@/lib/crt-ops.server";

/* ---------------------------------------------------------------- batches */

export const getBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("batches").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => batchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("batches").update(payload).eq("id", id)
      : context.supabase.from("batches").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStudentBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentBatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: { batch_id: string | null; batch?: string | null } = { batch_id: data.batch_id };
    if (data.batch_id) {
      const { data: b } = await context.supabase
        .from("batches")
        .select("name")
        .eq("id", data.batch_id)
        .maybeSingle();
      patch.batch = b?.name ?? null;
    } else {
      patch.batch = null;
    }
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------- sessions */

export const getSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("sessions").update(payload).eq("id", id)
      : context.supabase.from("sessions").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- attendance */

export const getAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("attendance").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => attendanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const rows = data.entries.map((e) => ({
      session_id: data.session_id,
      student_id: e.student_id,
      present: e.present,
      marked_at: new Date().toISOString(),
    }));
    const { error } = await context.supabase
      .from("attendance")
      .upsert(rows, { onConflict: "session_id,student_id" });
    if (error) throw new Error(error.message);
    const { error: sErr } = await context.supabase
      .from("sessions")
      .update({ status: "conducted" })
      .eq("id", data.session_id)
      .eq("status", "planned");
    if (sErr) throw new Error(sErr.message);
    return { ok: true, marked: rows.length };
  });

/* ------------------------------------------------------------------ roles */

export const getRoleAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      context.supabase.from("user_roles").select("*"),
      context.supabase.from("profiles").select("id, user_id, full_name, email, roll_number"),
    ]);
    return { roles: roles ?? [], profiles: profiles ?? [] };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    // The super admin role is permanent: it can neither be taken away nor granted.
    const { data: current } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if ((current ?? []).some((r: { role: string }) => r.role === "admin")) {
      throw new Error("The super admin role is permanent and cannot be changed.");
    }
    if (data.role === "admin") {
      throw new Error("The super admin role cannot be assigned to another account.");
    }

    const { error: delErr } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------- mock interviews */

export const getMockInterviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mock_interviews")
      .select("*")
      .order("held_on", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMockInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => mockSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("mock_interviews").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------- practice */

export const getPractice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: problems }, { data: progress }] = await Promise.all([
      context.supabase.from("practice_problems").select("*").order("sort_order"),
      context.supabase.from("practice_progress").select("*"),
    ]);
    return { problems: problems ?? [], progress: progress ?? [] };
  });

export const createPracticeProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => practiceProblemSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("practice_problems").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPracticeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => practiceStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("practice_progress")
      .upsert(
        { student_id: data.student_id, problem_id: data.problem_id, status: data.status },
        { onConflict: "student_id,problem_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------- resources */

export const getResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resourceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("resources").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------- notifications */

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Staff action: raise low-attendance and upcoming-test alerts for students. */
export const runAlertSweep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: profiles }, { data: sessions }, { data: attendance }, { data: tests }] =
      await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, batch_id"),
        supabase.from("sessions").select("id, batch_id, status"),
        supabase.from("attendance").select("student_id, present"),
        supabase.from("tests").select("id, title, starts_at, published, batch_id"),
      ]);

    const conducted = new Set(
      (sessions ?? []).filter((s) => s.status === "conducted").map((s) => s.id),
    );
    const stats = new Map<string, { total: number; present: number }>();
    for (const a of attendance ?? []) {
      const cur = stats.get(a.student_id) ?? { total: 0, present: 0 };
      cur.total += 1;
      if (a.present) cur.present += 1;
      stats.set(a.student_id, cur);
    }

    const now = Date.now();
    const soon = (tests ?? []).filter(
      (t) =>
        t.published &&
        new Date(t.starts_at).getTime() > now &&
        new Date(t.starts_at).getTime() - now < 3 * 24 * 60 * 60 * 1000,
    );

    const rows: {
      user_id: string;
      title: string;
      body: string;
      kind: string;
    }[] = [];

    for (const p of profiles ?? []) {
      if (!p.user_id) continue;
      const s = stats.get(p.id);
      if (s && s.total >= 3) {
        const pctVal = Math.round((s.present / s.total) * 100);
        if (pctVal < 75) {
          rows.push({
            user_id: p.user_id,
            title: `Low attendance: ${pctVal}%`,
            body: `You have attended ${s.present} of ${s.total} conducted sessions. 75% is the minimum expected.`,
            kind: "attendance",
          });
        }
      }
      for (const t of soon) {
        if (t.batch_id && p.batch_id && t.batch_id !== p.batch_id) continue;
        rows.push({
          user_id: p.user_id,
          title: `Upcoming test: ${t.title}`,
          body: `Starts ${new Date(t.starts_at).toLocaleString()}.`,
          kind: "test",
        });
      }
    }

    if (!rows.length) return { ok: true, created: 0, conducted: conducted.size };
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, created: rows.length, conducted: conducted.size };
  });
