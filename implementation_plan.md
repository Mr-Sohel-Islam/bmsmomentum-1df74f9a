# End-to-End System Configuration & Loophole Elimination Plan

This plan details the end-to-end configuration and fixes required to eliminate all loopholes, `400 Bad Request` validation crashes, `404 Not Found` endpoint mismatches, and `undefined` field errors across the entire BMS MOMENTUM platform.

---

## 🔍 Code Audit Findings

### 1. [P0] Zod UUID Schema Validation Rejection of Non-UUID / Seeded Entity IDs
- **Issue**: TanStack server functions in `frontend/src/lib/` (`approvals.functions.ts`, `tasks.functions.ts`, `admin.functions.ts`, `performance.functions.ts`, `teams.functions.ts`) enforced `z.string().uuid()` on all ID inputs.
- **Root Cause**: Database seeds and entity creation use readable string slugs and prefixed IDs (e.g. `soheljavadeveloper`, `alex.rivera`, `pos-admin`, `wf-medical-op`, `apreq-robert-chen`, `team-core-eng`, `task-101`, `sprint-10`, `epic-onboarding-v2`). Passing these valid IDs caused Zod parsing exceptions, resulting in `400 Bad Request` or function invocation failures before reaching the backend API.
- **Fix**: Replace `z.string().uuid()` with `z.string().min(1)` across all TanStack server functions in `frontend/src/lib/`.

### 2. [P1] Team Member Removal Parameter Mismatch
- **Issue**: `removeTeamMember` in `frontend/src/lib/teams.functions.ts` called `/teams/${data.id}/members/${data.id}`, which failed with `404 Not Found`.
- **Root Cause**: Backend route `DELETE /api/teams/:id/members/:userId` expects a separate `team_id` and `user_id`.
- **Fix**: Update `removeTeamMember` schema in `teams.functions.ts` to take `{ team_id: string, user_id: string }` and construct URL `/teams/${data.team_id}/members/${data.user_id}`.

### 3. [P1] Approval Engine & Entity Status Synchronization
- **Issue**: Approval/Rejection actions on product onboarding requests must automatically update `product_items.status` to `onboarded` or `rejected` and increment linked `product_tasks.onboarded_count`.
- **Fix**: Verified and ensured real-time status update in `ApprovalModel.recordAction` (`backend/models/approval.model.ts`).

---

## 🛠️ Proposed Changes

### [Frontend Server Functions] (`frontend/src/lib/`)

#### [MODIFY] [approvals.functions.ts](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/lib/approvals.functions.ts)
- Change `z.string().uuid()` to `z.string().min(1)` for `id`, `workflow_id`, `request_id`.

#### [MODIFY] [tasks.functions.ts](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/lib/tasks.functions.ts)
- Change `z.string().uuid()` to `z.string().min(1)` for `id`, `assignee_id`, `team_id`, `epic_id`, `sprint_id`, `story_id`, `task_id`, `task_ids`.

#### [MODIFY] [admin.functions.ts](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/lib/admin.functions.ts)
- Change `z.string().uuid()` to `z.string().min(1)` for `id`, `user_id`, `position_id`, `manager_id`.

#### [MODIFY] [performance.functions.ts](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/lib/performance.functions.ts)
- Change `z.string().uuid()` to `z.string().min(1)` for `id`, `user_id`, `metric_id`, `to_user`, `recipients`.

#### [MODIFY] [teams.functions.ts](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/lib/teams.functions.ts)
- Change `z.string().uuid()` to `z.string().min(1)` for `id`, `lead_id`, `team_id`, `user_id`.
- Fix `removeTeamMember` to accept `{ team_id: string, user_id: string }` and call `/teams/${data.team_id}/members/${data.user_id}`.

---

## 🧪 Verification Plan

### Automated Verification
1. `npm run build --prefix backend` to ensure backend TypeScript compilation clean.
2. `npm run build --prefix frontend` to ensure frontend production bundle build clean.

### Manual Verification
1. Test database reset and seed flow.
2. Verify frontend-backend connectivity without 400s, 404s, or undefined fields.
