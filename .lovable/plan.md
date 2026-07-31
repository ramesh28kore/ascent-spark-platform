## Goal

The **Existing credentials** tab currently only lists students and resets passwords. Add account **deletion** there, working the same way as the Trainers tab. No editing of roll numbers, emails or other fields.

## What you'll get

On **Admin console → Existing credentials**:

- A **Delete** button on every student row, next to "Reset to roll".
- A confirmation dialog naming the student ("Delete 23Q61A0501? Their login, profile and all linked records will be removed. This cannot be undone.") with Cancel / Delete.
- A **checkbox column** plus a select-all box in the header, and a **Delete selected (N)** button above the table for clearing a whole section or batch at once. Bulk delete uses one confirmation and reports how many succeeded and how many failed.
- The list refreshes automatically after deletion, and every delete is written to the audit log.

The Trainers tab keeps its existing Delete button; behaviour there is unchanged apart from getting the same confirmation dialog wording.

## Technical notes

- Reuse the existing `deleteAccount` server function (already `requireAdmin`-gated and audit-logged) for single deletes.
- Add `deleteAccounts` to `src/lib/admin.functions.ts`: takes an array of up to ~300 user IDs, requires the `admin` role, refuses the caller's own ID, deletes each auth user via the admin API, and returns `{ deleted, failed: [{ userId, reason }] }` with one audit entry recording the count.
- In `src/routes/_authenticated/admin.tsx`, extend the `Directory` component with row selection state, an `AlertDialog` confirmation, and mutations that invalidate the `student-credentials` query on success.
- Deleting the auth user cascades to the profile and role rows through the existing foreign keys; no schema migration is needed.
- Verification: sign in as the super admin, generate two throwaway student accounts, delete one via the row button and one via bulk select, and confirm both disappear from the list, can no longer sign in, and appear in the audit log.
