#!/usr/bin/env node
/**
 * Migration sanity checks — dependency-free, read-only.
 *
 * Fails CI when a migration in supabase/migrations breaks project invariants:
 *  - CREATE TABLE public.x without GRANT on that table
 *  - CREATE TABLE public.x without ENABLE ROW LEVEL SECURITY
 *  - RLS enabled on a table created here but no CREATE POLICY for it
 *  - filenames that are not YYYYMMDDHHMMSS_*.sql, or duplicate timestamps
 *  - DDL against protected schemas (auth, storage, realtime, vault, supabase_functions)
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const PROTECTED = ["auth", "storage", "realtime", "vault", "supabase_functions"];
const FILENAME_RE = /^(\d{14})_[\w.-]+\.sql$/;

/** Strip comments and string literals so regex scanning sees only SQL code. */
function stripNoise(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " $BODY$ ")
    .replace(/'(?:[^']|'')*'/g, "''");
}

const errors = [];
const warnings = [];

if (!existsSync(DIR)) {
  console.log(`No ${DIR} directory — skipping migration checks.`);
  process.exit(0);
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const seenTimestamps = new Map();

for (const file of files) {
  const match = FILENAME_RE.exec(file);
  if (!match) {
    errors.push(`${file}: filename must match YYYYMMDDHHMMSS_<name>.sql`);
  } else {
    const ts = match[1];
    if (seenTimestamps.has(ts)) {
      errors.push(`${file}: duplicate migration timestamp ${ts} (also ${seenTimestamps.get(ts)})`);
    } else {
      seenTimestamps.set(ts, file);
    }
  }

  const raw = readFileSync(join(DIR, file), "utf8");
  const sql = stripNoise(raw);

  // Protected schema DDL
  for (const schema of PROTECTED) {
    const re = new RegExp(
      `\\b(create|alter|drop)\\s+(table|trigger|policy|function|type|index)\\s+(if\\s+(not\\s+)?exists\\s+)?(only\\s+)?${schema}\\.`,
      "i",
    );
    if (re.test(sql)) {
      errors.push(`${file}: modifies protected schema "${schema}" — not allowed`);
    }
  }

  // Tables created in this file
  const createRe = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.("?)([a-zA-Z_][\w]*)\1/gi;
  const created = new Set();
  let m;
  while ((m = createRe.exec(sql)) !== null) created.add(m[2].toLowerCase());

  for (const table of created) {
    const t = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const hasGrant = new RegExp(
      `\\bgrant\\s+[\\s\\S]{0,200}?\\bon\\s+(table\\s+)?public\\.("?)${t}\\2\\b`,
      "i",
    ).test(sql);
    if (!hasGrant) {
      errors.push(
        `${file}: public.${table} is created without a GRANT — PostgREST will return a permission error`,
      );
    }

    const hasRls = new RegExp(
      `\\balter\\s+table\\s+(only\\s+)?public\\.("?)${t}\\2\\s+enable\\s+row\\s+level\\s+security`,
      "i",
    ).test(sql);
    if (!hasRls) {
      errors.push(`${file}: public.${table} is created without ENABLE ROW LEVEL SECURITY`);
      continue;
    }

    const hasPolicy = new RegExp(
      `\\bcreate\\s+policy\\s+[\\s\\S]{0,200}?\\bon\\s+public\\.("?)${t}\\1\\b`,
      "i",
    ).test(sql);
    if (!hasPolicy) {
      warnings.push(
        `${file}: public.${table} has RLS enabled but no CREATE POLICY in this migration — the table is locked unless a later migration adds one`,
      );
    }
  }
}

console.log(`Checked ${files.length} migration file(s) in ${DIR}.`);

for (const w of warnings) console.log(`  warning: ${w}`);
for (const e of errors) console.error(`  error:   ${e}`);

if (errors.length > 0) {
  console.error(`\nMigration sanity check failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `\nMigration sanity check passed with ${warnings.length} warning(s).`
    : "\nMigration sanity check passed.",
);
