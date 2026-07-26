# Phase 4 — Access, Tasks & Approvals

Big phase. Breaking it into 5 focused sub-phases so each ships independently and we can course-correct between them.

## 4.1 — Roles, Super Admin & Onboarding

**Schema**

- Extend `app_role` enum: `super_admin`, `admin`, `manager`, `member`.
- Add `permissions` table: `(user_id, permission)` where permission ∈ `onboard_users`, `score_performance`, `send_appreciation`, `approve_requests`, `view_team`, `manage_metrics`.
- Add `positions` table: `id`, `title`, `level` (int, hierarchy rank), `parent_position_id` (self-FK) → org tree.
- Extend `profiles`: `position_id`, `manager_id` (self-FK for direct-report hierarchy), `is_active`.
- Trigger: bootstrap `soheljavadeveloper@gmail.com` as `super_admin` on first sign-in; block role changes on that user via trigger.
- RLS + `has_permission(uid, perm)` security-definer function mirroring `has_role`.

**Server functions** (`src/lib/admin.functions.ts` grows)

- `createUser({ email, password, full_name, position_id, manager_id, roles[], permissions[] })` — uses `supabaseAdmin.auth.admin.createUser` (loaded inside handler). Only callers with `onboard_users` permission OR admin role.
- `updateUserPassword({ user_id, new_password })` — admin-only; super admin's password cannot be changed by others.
- `updateUserProfile({ user_id, position_id, manager_id, is_active })`.
- `grantPermission` / `revokePermission`.
- `assignRole` / `removeRole` — blocks touching super admin.
- `changeMyPassword({ current, new })` — any signed-in user for themselves.

**UI**

- Remove public sign-up path from `/auth` (keep sign-in + Google). Show "Contact your admin for access".
- `/admin/users` upgraded: create-user dialog, edit position/manager, role checkboxes, permission checkboxes, reset-password action, deactivate. Super admin row is locked (visual badge, disabled controls).
- `/admin/positions` — CRUD org positions + hierarchy tree.
- `/account` — every user can change own password + view their roles/permissions.

## 4.2 — Tasks

**Schema**

- `tasks`: `title`, `description`, `assignee_id`, `assigner_id`, `status` (todo/in_progress/blocked/done), `priority`, `points` (int), `due_date`, `completed_at`.
- `task_comments`: `task_id`, `author_id`, `body`.
- On task `done` + approval (see 4.3), award `points` into `metric_scores` under a system "Tasks" metric.
- RLS: assignee & assigner can read/update own; managers can read reports' tasks; admins full.

**Server functions** — `src/lib/tasks.functions.ts`: `listMyTasks`, `listAssignedByMe`, `listTeamTasks`, `createTask`, `updateTask`, `deleteTask`, `completeTask`.

**UI**

- Sidebar: "Tasks" workspace entry.
- `/tasks` — kanban-style board (columns by status) + list toggle. Task drawer with comments, points, due date.
- Task creation dialog with assignee picker (respects hierarchy).

## 4.3 — Approvals

**Schema**

- `approval_workflows`: `name`, `entity_type` (task / score / appreciation / report), `active`.
- `approval_steps`: `workflow_id`, `order`, `approver_type` (role / permission / specific_user / manager_of_requester), `approver_ref`.
- `approval_requests`: `workflow_id`, `entity_type`, `entity_id`, `requester_id`, `status` (pending/approved/rejected), `current_step`.
- `approval_actions`: per-step decision log with `approver_id`, `decision`, `note`.
- Trigger on entity state changes (task→done, score insert, appreciation insert) creates request if matching workflow exists; entity considered "final" only when request approved.

**Server functions** — `src/lib/approvals.functions.ts`: workflow CRUD, `listPendingForMe`, `decideRequest`.

**UI**

- `/admin/approvals` — workflow builder (drag steps, pick approver type).
- `/approvals` — user inbox of pending items across all entity types.
- Inline "Pending approval" badges on tasks/scores/appreciations.

## 4.4 — Fine-grained Permissions Wiring

- Every server function checks required permission via `has_permission(auth.uid(), 'x')` OR role.
- UI hides/disables controls based on `useMyPermissions()` hook loaded once at layout.
- Admin UI to bundle permissions into named "permission sets" for quick assignment.

## 4.5 — Polish

- Audit log table for admin actions (role/permission/password/user changes).
- Toasts + optimistic updates across tasks/approvals.
- Update sidebar grouping: Workspace (Dashboard, Performance, Tasks, Appreciation, Approvals, Account) / Admin (Users, Positions, Metrics, Team scores, Flows, Approvals, Audit log).

---

## Technical notes

- Super admin lock: DB trigger on `user_roles` and `auth.users` password change attempts targeting the super-admin user_id (looked up by email) rejects with exception. Client also disables UI.
- Password changes done server-side via `supabaseAdmin.auth.admin.updateUserById` after permission check; `changeMyPassword` uses user-scoped client with `updateUser({ password })`.
- Removing public sign-up: `supabase--configure_auth` with `disable_signup: true`. Admin creation path uses admin API which bypasses that.
- Existing `app_role` enum only has `"admin"`; migration adds new values (Postgres requires committed enum add before use — will use separate migration or `ALTER TYPE ... ADD VALUE` in a single transaction with subsequent uses deferred to a second migration if needed).
- Super admin bootstrap runs even if that user hasn't signed up yet: create the auth user via admin API in the migration's DO block using `SUPABASE_SERVICE_ROLE_KEY`? No — migrations run SQL only. Instead: seed a row in a `reserved_super_admins(email)` table; `handle_new_user` promotes on match. For immediate setup I'll also create the auth user via a one-off admin server function `bootstrapSuperAdmin` that anyone can call once (idempotent, no-op if user exists).

## Suggested execution order

Ship 4.1 first (biggest unlock: closes public signup, gives you super admin + user creation). Then 4.2 tasks. Then 4.3 approvals. Then 4.4/4.5 wiring & polish. Confirm and I'll start 4.1.
