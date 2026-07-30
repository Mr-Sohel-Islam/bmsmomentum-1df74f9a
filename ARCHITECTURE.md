# 🏛️ BMS MOMENTUM — AI Context & Architecture Navigation Map

This document serves as the **authoritative architecture map and file index** for AI coding assistants and developers. It allows any AI agent to understand the entire application structure, locate exact code files, follow data flows, and make modifications **without requiring wasteful full-codebase directory scans**.

---

## 📌 Executive Summary & Technology Stack

| Layer | Technology | Primary Entry Points |
|:---|:---|:---|
| **Backend API** | Node.js, Express, TypeScript, MySQL2 Pool | [`backend/app.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/backend/app.ts), [`backend/db.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/backend/db.ts) |
| **Database** | MySQL (Cloud Aiven / Local) | [`backend/db.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/backend/db.ts) |
| **Frontend UI** | React 18, TanStack Router, TanStack Query, Vite | [`frontend/src/routes/__root.tsx`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/routes/__root.tsx), [`frontend/src/routeTree.gen.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/routeTree.gen.ts) |
| **Styling & Themes**| Vanilla CSS Tokens, Dynamic Theme Switcher | [`frontend/src/styles.css`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/styles.css), [`frontend/src/hooks/use-theme.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/frontend/src/hooks/use-theme.ts) |

---

## 📂 File Location Index — Where to Find Everything

### 1. Backend Code Structure (`/backend`)

```
backend/
├── app.ts                         # Express server setup, CORS, JSON body parsers, router mount points
├── db.ts                          # MySQL pool creation, auto-migration (addColumnIfNotExist), resetAndSeedDatabase()
├── middleware/
│   └── auth.middleware.ts         # JWT authentication (requireAuth) & RBAC permission checks (requirePermission)
├── routes/
│   ├── index.ts                   # Master router combining all sub-routers
│   ├── product.routes.ts          # Products, custom forms, onboarding items, types/categories, dependencies
│   ├── task.routes.ts             # Agile tasks, Sprints, Epics, Kanban status updates
│   ├── approval.routes.ts         # Workflows, multi-step approval requests, approver actions
│   ├── user.routes.ts             # User profiles, positions, roles, permissions, /reset-seed
│   ├── team.routes.ts             # Teams, team memberships, lead assignments
│   ├── performance.routes.ts      # KPI metric definitions and user metric scores
│   └── appreciation.routes.ts     # Peer appreciation feed and kudos sending
├── controllers/
│   ├── product.controller.ts      # Request handlers for product definitions and onboarding
│   ├── approval.controller.ts     # Approval request creation and step decision handlers
│   ├── task.controller.ts         # Task CRUD and sprint management handlers
│   ├── user.controller.ts         # User profiles, roles, and permission handlers
│   ├── team.controller.ts         # Team management handlers
│   └── appreciation.controller.ts # Appreciation feed handlers
├── models/
│   ├── product.model.ts           # Product MySQL queries, ensureProductColumns(), item onboarding, cascade deletes
│   ├── approval.model.ts          # Multi-step approval progression & AUTOMATED ENTITY STATUS SYNC
│   ├── task.model.ts              # Sprint, Epic, Task MySQL queries & burndown telemetry
│   ├── user.model.ts              # Profile queries, user roles, positions
│   ├── team.model.ts              # Team and team member SQL operations
│   └── appreciation.model.ts      # Appreciation SQL queries with profile JOINs (sender & recipient)
└── utils/
    ├── response.ts                # Standardized JSON response wrapper (sendSuccess, sendError, AppError)
    └── index.ts                   # Helper functions (UUID crypto, async handlers)
```

---

### 2. Frontend Code Structure (`/frontend/src`)

```
frontend/src/
├── routes/
│   ├── __root.tsx                 # Root layout document, HTML theme class injector, suppressHydrationWarning
│   ├── _authenticated.tsx         # Auth guard layout wrapper (redirects unauthenticated users to /auth)
│   └── _authenticated/
│       ├── products/
│       │   └── index.tsx          # Master Products Surface: Define Product, Dynamic Form Builder,
│       │                          # Onboard Record, Dynamic Type/Category creation, Dependency Graph
│       ├── tasks.tsx              # Kanban Board, Sprint planning, Epic task filters, Burndown chart
│       ├── approvals.tsx          # Pending approvals review queue & action modal
│       ├── appreciation.tsx       # Kudos feed & peer recognition leaderboard
│       ├── performance.tsx        # Employee KPI scores and performance reviews
│       └── admin/
│           ├── team.tsx           # Team management & member allocations
│           ├── positions.tsx      # Job title definitions & department assignments
│           ├── users.tsx          # User accounts, role assignments, manager hierarchy
│           ├── flows.tsx          # Approval workflow builder (Step 1 Manager, Step 2 Admin)
│           ├── approvals.tsx      # Admin global approval audit log
│           └── metrics.tsx        # System KPI metric configuration
├── components/
│   ├── app-sidebar.tsx            # Navigation sidebar with route links & theme selector
│   ├── theme-toggle.tsx           # Quick theme palette switcher (Dark, Dark Premium, Winter Light, Cherry Blossom, Sunny Yellow)
│   └── products/
│       ├── form-builder.tsx       # Drag/add custom field builder for product definitions
│       └── dynamic-form-renderer.tsx # Dynamic input renderer (text, number, select, date, textarea, checkbox)
├── lib/
│   ├── api-client.ts              # Fetch wrapper with Authorization bearer token & error handling
│   ├── products.functions.ts      # TanStack server functions for Product API calls
│   ├── tasks.functions.ts         # TanStack server functions for Tasks/Sprints API calls
│   ├── approvals.functions.ts     # TanStack server functions for Approval API calls
│   ├── admin.functions.ts         # TanStack server functions for User/Team/Position API calls
│   └── performance.functions.ts   # TanStack server functions for Appreciations/Metrics API calls
└── hooks/
    └── use-theme.ts               # Theme state hook persisting to localStorage ("momentum-theme")
```

---

## 🗄️ Database Tables & Key Foreign Keys

| Table Name | Primary Key | Description & Key Columns |
|:---|:---|:---|
| `products` | `id` | Product templates (e.g. Doctor, API Gateway). Columns: `name`, `slug`, `product_type`, `category`, `form_schema` (JSON), `approval_settings` (JSON), `created_by`. |
| `product_items` | `id` | Onboarded record instances (e.g. Dr. Sarah Connor). Columns: `product_id`, `item_name`, `status` (`pending_approval`\|`onboarded`\|`rejected`), `approval_request_id`, `custom_fields` (JSON). |
| `product_form_schemas`| `id` | Form schemas. Columns: `name`, `schema_type`, `fields` (JSON). |
| `product_tasks` | `id` | Onboarding quantity goals. Columns: `title`, `target_quantity`, `onboarded_count`, `status`. |
| `product_dependencies`| `id` | Product relationships. Columns: `product_id`, `depends_on_product_id`, `dependency_type`, `custom_fields` (JSON). |
| `approval_workflows` | `id` | Workflow definitions. Columns: `name`, `entity_type`, `active`. |
| `approval_steps` | `id` | Multi-stage steps. Columns: `workflow_id`, `step_order`, `approver_type`, `approver_ref`. |
| `approval_requests` | `id` | Pending & historical approval requests. Columns: `workflow_id`, `requester_id`, `entity_type`, `entity_id`, `status` (`pending`\|`approved`\|`rejected`), `current_step_order`. |
| `approval_actions` | `id` | Audit trail of approver decisions. Columns: `request_id`, `approver_id`, `step_order`, `decision`, `note`. |
| `sprints` | `id` | Agile Sprints. Columns: `name`, `goal`, `status`, `start_date`, `end_date`, `target_points`, `completed_points`. |
| `epics` | `id` | Agile Epics. Columns: `name`, `description`, `status`, `team_id`. |
| `tasks` | `id` | Agile tasks. Columns: `title`, `status` (`todo`\|`in_progress`\|`in_review`\|`done`), `points`, `assignee_id`, `epic_id`, `sprint_id`, `team_id`. |
| `profiles` | `id` | User details. Columns: `full_name`, `avatar_url`, `department`, `position_id`, `manager_id`, `is_active`. |
| `user_roles` | `id` | User role mapping (`super_admin`, `admin`, `manager`, `product_owner`, `developer`). |
| `teams` | `id` | Teams. Columns: `name`, `description`, `lead_id`. |
| `appreciations` | `id` | Peer recognition. Columns: `from_user`/`sender_id`, `to_user`/`recipient_id`, `message`, `points`, `badge_type`. |

---

## ⚡ Core Operational Data Flows

### 1. Product Onboarding & Approval Entity Synchronization Flow
```
[User Submits Onboarding Form]
       │
       ▼
1. System reads product approval_settings JSON
       │
       ├─► If require_approval == true:
       │     - Insert product_items with status = 'pending_approval'
       │     - Insert approval_requests with status = 'pending', current_step_order = 1
       │     - Route request to Approver (Manager or Admin)
       │
       └─► If require_approval == false:
             - Insert product_items with status = 'onboarded'

[Approver Reviews in /approvals]
       │
       ▼
2. Approver submits decision in ApprovalModel.recordAction:
       │
       ├─► If REJECTED:
       │     - Update approval_requests.status = 'rejected'
       │     - AUTOMATICALLY update product_items.status = 'rejected'
       │
       └─► If APPROVED:
             - If more steps remain: advance current_step_order + 1
             - If final step approved:
                 - Update approval_requests.status = 'approved'
                 - AUTOMATICALLY update product_items.status = 'onboarded'
                 - Increment product_tasks.onboarded_count
```

---

## 💡 AI Developer Rules & Best Practices

1. **Database Modularity & Migration**:
   - Always run `ensureProductColumns()` before querying `products` or `product_items` in `product.model.ts` to safeguard against missing columns in legacy DB schemas.
   - Use `addColumnIfNotExist(connection, table, column, definition)` in [`backend/db.ts`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/backend/db.ts) when adding new fields.

2. **Frontend-Backend API Contracts**:
   - When creating a new endpoint in `backend/routes/x.routes.ts`, create the corresponding TanStack server function wrapper in `frontend/src/lib/x.functions.ts` using `apiClient.get()` / `apiClient.post()`.

3. **Hydration Warning Safeguard**:
   - Root HTML in `frontend/src/routes/__root.tsx` must keep `suppressHydrationWarning` on the `<html lang="en">` element due to client-side localStorage theme injection before React load.

4. **Cascading Deletions**:
   - When deleting a product item, always invoke `ProductModel.deleteProductItem(id)` which cascades deletion to linked `approval_requests` and `approval_actions`.
