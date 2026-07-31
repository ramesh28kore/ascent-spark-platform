## Goal
Add a delete action to each row of the Roles & access page (`/roles`), reusing the existing super-admin account deletion.

## What changes
`src/routes/_authenticated/roles.tsx` only — no backend changes needed; `deleteAccount` already exists in `src/lib/admin.functions.ts` and is gated to the super admin server-side (and refuses self-deletion).

1. Add an "Actions" column to the accounts table.
2. Each row gets a destructive trash/Delete button, shown only when the viewer is an admin, and disabled for the viewer's own account.
3. Clicking opens a confirmation dialog (AlertDialog) naming the person and warning that the login, profile, and role are removed permanently.
4. On confirm, call `deleteAccount({ data: { userId } })` via `useServerFn`, toast success/error, and invalidate the `role-assignments` query so the row disappears.

## Notes
- Non-admins see no delete button; the server check still blocks direct calls.
- Deletion cascades to profile and role rows and is written to the audit log, same as in the Admin console.
