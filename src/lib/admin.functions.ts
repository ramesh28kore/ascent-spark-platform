import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { DEFAULT_DOMAIN, SUPER_ADMIN_EMAIL, normaliseRoll, rollToEmail } from "./admin-shared";

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

/** Throws unless the calling user holds the `admin` role. */
async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(data ?? []).some((r: { role: string }) => r.role === "admin")) {
    throw new Error("Only the super admin can manage credentials.");
  }
}

async function audit(
  db: AdminClient,
  actorId: string,
  action: string,
  entity: string,
  detail: Record<string, unknown>,
) {
  await db.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity,
    detail: detail as never,
  });
}

/** Replace whatever role the signup trigger assigned with the intended one. */
async function setRole(
  db: AdminClient,
  userId: string,
  role: "admin" | "trainer" | "student" | "placement",
) {
  await db.from("user_roles").delete().eq("user_id", userId).neq("role", role);
  await db.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
}

async function findUserIdByEmail(db: AdminClient, email: string): Promise<string | null> {
  const { data } = await db
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();
  return data?.user_id ?? null;
}

/* ------------------------------------------------------------------ */
/* Credential settings                                                 */
/* ------------------------------------------------------------------ */

/*
 * The super-admin account is provisioned once from backend secrets and then
 * managed through this console. There is deliberately NO unauthenticated
 * bootstrap endpoint: a public server function that can create or re-grant the
 * `admin` role would be callable by anyone who knows the URL.
 */

export const getCredentialSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data } = await context.supabase
      .from("credential_settings")
      .select("domains, default_domain")
      .maybeSingle();
    return {
      domains: data?.domains ?? [DEFAULT_DOMAIN],
      defaultDomain: data?.default_domain ?? DEFAULT_DOMAIN,
    };
  });


export const saveCredentialSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        domains: z.array(z.string().trim().min(3).max(80)).min(1).max(20),
        defaultDomain: z.string().trim().min(3).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();
    const domains = Array.from(
      new Set(data.domains.map((d) => d.toLowerCase().replace(/^@/, "").trim())),
    );
    const defaultDomain = data.defaultDomain.toLowerCase().replace(/^@/, "").trim();
    if (!domains.includes(defaultDomain)) domains.push(defaultDomain);

    await db
      .from("credential_settings")
      .upsert({ id: true, domains, default_domain: defaultDomain }, { onConflict: "id" });
    return { domains, defaultDomain };
  });

/* ------------------------------------------------------------------ */
/* Trainers                                                            */
/* ------------------------------------------------------------------ */

export const listStaffAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const db = await admin();
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["trainer", "admin", "placement"]);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return { staff: [] };

    const { data: profiles } = await db
      .from("profiles")
      .select("id, user_id, full_name, email, branch, created_at")
      .in("user_id", ids);

    return {
      staff: (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.user_id)?.role ?? "trainer",
      })),
    };
  });

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Enter the trainer's full name").max(120),
        email: z.string().trim().email("Enter a valid email").max(160),
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
        branch: z.string().trim().max(60).optional().default(""),
        role: z.enum(["trainer", "placement", "admin"]).default("trainer"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();
    const email = data.email.toLowerCase();

    if (await findUserIdByEmail(db, email)) {
      throw new Error(`An account already exists for ${email}.`);
    }

    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, branch: data.branch },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    await setRole(db, created.user.id, data.role);
    await db
      .from("profiles")
      .update({ full_name: data.fullName, email, branch: data.branch || null })
      .eq("user_id", created.user.id);

    await audit(db, context.userId, "create_staff_account", "profiles", {
      email,
      role: data.role,
    });

    return { email, password: data.password, role: data.role };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(6, "Password must be at least 6 characters").max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "reset_password", "auth.users", { user_id: data.userId });
    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot remove your own account.");
    const db = await admin();
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "delete_account", "auth.users", { user_id: data.userId });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Student credential generation                                       */
/* ------------------------------------------------------------------ */

const generateSchema = z.object({
  rolls: z.array(z.string().trim().min(3).max(40)).min(1, "Add at least one roll number").max(300),
  domain: z.string().trim().min(3).max(80),
  batchId: z.string().uuid().nullable().optional(),
  batchName: z.string().trim().max(60).optional().default(""),
  section: z.string().trim().max(20).optional().default(""),
  year: z.string().trim().max(20).optional().default(""),
  branch: z.string().trim().max(60).optional().default(""),
});

export const previewStudentCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();
    const rolls = Array.from(new Set(data.rolls.map(normaliseRoll)));
    const emails = rolls.map((r) => rollToEmail(r, data.domain));

    const { data: existing } = await db.from("profiles").select("email").in("email", emails);
    const taken = new Set((existing ?? []).map((e) => (e.email ?? "").toLowerCase()));

    return {
      rows: rolls.map((roll) => {
        const email = rollToEmail(roll, data.domain);
        return { roll, email, password: roll, exists: taken.has(email) };
      }),
    };
  });

export const generateStudentCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();

    const rolls = Array.from(new Set(data.rolls.map(normaliseRoll)));
    const created: { roll: string; email: string; password: string }[] = [];
    const skipped: { roll: string; reason: string }[] = [];

    for (const roll of rolls) {
      const email = rollToEmail(roll, data.domain);
      try {
        if (await findUserIdByEmail(db, email)) {
          skipped.push({ roll, reason: "Account already exists" });
          continue;
        }

        const { data: user, error } = await db.auth.admin.createUser({
          email,
          password: roll,
          email_confirm: true,
          user_metadata: {
            full_name: roll,
            roll_number: roll,
            branch: data.branch,
            year: data.year,
            batch: data.batchName,
          },
        });
        if (error || !user.user) {
          skipped.push({ roll, reason: error?.message ?? "Could not create account" });
          continue;
        }

        await setRole(db, user.user.id, "student");
        await db
          .from("profiles")
          .update({
            full_name: roll,
            email,
            roll_number: roll,
            branch: data.branch || null,
            year: data.year || null,
            section: data.section || null,
            batch: data.batchName || null,
            batch_id: data.batchId ?? null,
          })
          .eq("user_id", user.user.id);

        created.push({ roll, email, password: roll });
      } catch (err) {
        skipped.push({ roll, reason: err instanceof Error ? err.message : "Unexpected error" });
      }
    }

    await audit(db, context.userId, "generate_student_credentials", "profiles", {
      domain: data.domain,
      batch: data.batchName,
      section: data.section,
      year: data.year,
      created: created.length,
      skipped: skipped.length,
    });

    return { created, skipped };
  });

export const listStudentCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(80).optional().default(""),
        batchId: z.string().uuid().nullable().optional(),
        section: z.string().trim().max(20).optional().default(""),
        year: z.string().trim().max(20).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();

    let query = db
      .from("profiles")
      .select("id, user_id, full_name, email, roll_number, section, year, batch, batch_id")
      .not("roll_number", "is", null)
      .order("roll_number", { ascending: true })
      .limit(500);

    if (data.batchId) query = query.eq("batch_id", data.batchId);
    if (data.section) query = query.eq("section", data.section);
    if (data.year) query = query.eq("year", data.year);
    if (data.search) query = query.or(`roll_number.ilike.%${data.search}%,email.ilike.%${data.search}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { students: rows ?? [] };
  });

/**
 * Gate for any credential sheet download. Throws unless the caller is the super
 * admin, and records the export in the audit log.
 */
export const authoriseCredentialExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ label: z.string().min(1), count: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db = await admin();
    await audit(db, context.userId, "credential_export", "credentials", {
      label: data.label,
      count: data.count,
    });
    return { ok: true as const };
  });
