## Goal

Make "super admin = credentials only" true at the API layer, not just in the sidebar. Right now the UI redirects the admin away from training pages, but a direct API call still succeeds in several places.

## What I verified in the live database

- Training data is excluded from the admin correctly for anything gated by `private.is_staff` / `private.can_view_all` (scores, attendance, attempts, certificates writes, etc.) — those already deny the admin.
- **Gap 1 — open reads.** Many tables have a SELECT policy of plain `true` for every signed-in user: `modules`, `module_topics`, `assessments`, `batches`, `announcements`, `resources`, `practice_problems`, `rubrics`, `discussion_posts`, `sessions`, plus `tests` where `published`. The super admin is signed in, so a direct API call returns all of this content.
- **Gap 2 — credential settings readable by trainers.** `credential_settings` SELECT is `is_staff OR is_admin`; only the admin should see the credential/domain configuration.
- **Gap 3 — an unauthenticated endpoint that touches the admin account.** `bootstrapSuperAdmin` in `src/lib/admin.functions.ts` has no auth middleware, so it is a public POST endpoint that can create the super-admin user and (re-)grant the `admin` role using the service key.
- **Gap 4 — a credentials endpoint missing the role check.** `getCredentialSettings` runs with only `requireSupabaseAuth`, no `requireAdmin`, so any signed-in student/trainer can read the configured domains.

## Plan

### 1. Database migration — exclude the admin from content reads

Add a `private.is_content_reader(uuid)` helper (`security definer`, granted to `authenticated`/`service_role`) that returns true for any signed-in user who is **not** admin-only. Replace the `USING (true)` SELECT policies on the content tables listed in Gap 1 with `USING (private.is_content_reader(auth.uid()))`, and change the `tests` read policy to `(published AND private.is_content_reader(auth.uid())) OR private.can_view_all(auth.uid())`.

Effect: students and trainers are unchanged; the super admin gets zero rows from the Data API on training content.

### 2. Database migration — tighten credential surfaces

- `credential_settings`: SELECT becomes admin-only (`private.is_admin(auth.uid())`), scoped `TO authenticated`.
- Confirm no INSERT/UPDATE/DELETE policy exists (writes stay service-role only, behind `saveCredentialSettings`).
- Keep `user_roles` / `profiles` / `audit_logs` admin reads as they are — the console needs them.

### 3. Server-function hardening

- `bootstrapSuperAdmin`: stop being a public endpoint. Require a shared bootstrap secret compared with a timing-safe check, and make it a no-op once the admin exists.
- `getCredentialSettings`: add the same `requireAdmin(context)` guard the other credential functions use.
- Sweep `admin.functions.ts` and the other `*.functions.ts` files for any function that mutates accounts, roles, or credentials without a role check, and add one.

### 4. Verification (the point of this task)

Run a real signed-in check with the admin's own bearer token against the Data API — not just a code read:

- As `avanthi`: reads of `modules`, `tests`, `assessments`, `scores`, `test_attempts` must all return empty/denied; reads of `profiles`, `user_roles`, `credential_settings`, `audit_logs` must still work.
- As a trainer: all training reads still work; `credential_settings` now denied.
- As a student: unchanged (own scores/attempts visible, answer keys still hidden).
- Call `getCredentialSettings` and `saveCredentialSettings` with a non-admin token and confirm both are rejected.
- Re-run the security linter and confirm the admin console still loads end to end in the preview.

## Technical notes

- All policy changes go through one migration; the new helper lives in the existing `private` schema so it is not callable from the Data API.
- No changes to the UI route guard — it stays as defence in depth.
- If any current admin-console query breaks under the tighter policies, it will be repointed at the service-role path inside a `requireAdmin`-guarded server function rather than loosening a policy.
