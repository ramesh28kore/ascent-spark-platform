## Goal
Turn "Create new credential" into a two-step flow: fill the form → review a preview panel → confirm. Nothing is written to the database or audit log until the confirm step.

## Step 1 — read-only preview check (server)
Add `previewCredential` to `src/lib/admin.functions.ts`:
- Super-admin gated (same `requireAdmin` check as the other functions), but performs **no writes and no audit entry**.
- Input: `kind` ("student" | "trainer") plus the same fields the create functions take.
- Student: normalise the roll number, build the email (`roll@domain`), confirm the domain is one of the configured domains, and check whether an account already exists for that email.
- Trainer: normalise the email and check for an existing account.
- Returns: resolved username/email, the password that will be issued, whether it already exists, the resolved branch/year/section/batch label, and a list of blocking problems vs. warnings.

## Step 2 — review panel in the dialog
In `src/routes/_authenticated/admin.tsx`, `CreateCredentialDialog` gains a `step` state (`"form"` | `"review"`), for both the Student and Trainer tabs:
- The primary button becomes **Review credential**, which calls `previewCredential`.
- The review panel replaces the form and shows:
  - Username/email and password in monospace, with copy buttons.
  - The account details being attached (name, role, branch, year, section, batch).
  - Password requirements checklist (length ≥ 8 for trainer, ≥ 6 for the roll-derived student password, plus a note that a student's password is their roll number in original case).
  - A red banner if the email is already taken — confirm is disabled in that case.
- Footer: **Back to edit** and **Create login**. Only **Create login** calls the existing `createStudentAccount` / `createStaffAccount`, so the database write and audit entry happen only after review.
- On success, the existing issued-credentials panel is shown as today; closing or switching tabs resets back to the form step.

## Notes
- No schema or RLS changes; `previewCredential` is read-only and reuses the existing super-admin gate.
- The existing bulk generator already has its own preview (`previewStudentCredentials`) and is untouched.
