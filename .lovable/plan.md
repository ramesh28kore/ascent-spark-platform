## Goal

Add a **Create new credential** button to the *Existing credentials* tab so a single student or trainer login can be issued on the spot, without going through the bulk generator. Same super-admin-only gating and audit logging as everything else in the console.

## What you'll get

A **Create new credential** button in the header of the Existing credentials card, opening a dialog with a Student / Trainer toggle:

**Student**
- Roll number (required), plus optional name, branch, year, section and batch, and the email-domain dropdown (from your saved domains).
- Live preview of the login it will produce: `23q61a0501@domain` with password `23Q61A0501` — exactly the same rule as the bulk generator.
- On save: the account is created and confirmed immediately, tagged with the batch/section/year, the list refreshes with the new row visible, and the issued username/password is shown with copy buttons.

**Trainer**
- Full name, username (email), branch, role (Trainer / Placement / Super admin) and a password field pre-filled by the generator with a copy/regenerate control.
- On save: account created, credentials shown with copy buttons.

Both paths show a clear inline error if the email or roll is already taken, and nothing is written when validation fails.

## Technical notes

- Add `createStudentAccount` to `src/lib/admin.functions.ts`: `requireAdmin` gate, Zod-validated input (roll 3–30 chars, optional name/branch/year/section max lengths, `batchId` uuid-or-null, domain validated against the saved credential-settings list), duplicate check via `findUserIdByEmail`, `createUser` with `email_confirm: true`, `setRole(..., "student")`, profile update, then an `audit(..., "create_student_account", ...)` entry recording roll, email, batch and section — never the password.
- The trainer path reuses the existing `createStaffAccount` function, which is already admin-gated and audited.
- In `src/routes/_authenticated/admin.tsx`, add a `CreateCredentialDialog` component (shadcn `Dialog` + `Tabs`) rendered from `Directory`, sharing the existing `randomPassword()` helper and invalidating both `student-credentials` and `staff-accounts` queries on success.
- No schema migration needed; no new RLS surface — the new function runs under the same admin check as the rest of `admin.functions.ts`.
- Verification: sign in as the super admin, create one student and one trainer through the dialog, confirm both appear in their lists and can sign in with the shown credentials, confirm a duplicate attempt is rejected, check the two audit rows, then delete the test accounts.
