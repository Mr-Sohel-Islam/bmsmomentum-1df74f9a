# 🏛️ BMS MOMENTUM — AI Context & Architecture Navigation Map

This document serves as the **authoritative architecture map and file index** for AI coding assistants and developers. It allows any AI agent to understand the entire application structure, locate exact code files, follow data flows, and make modifications **without requiring wasteful full-codebase directory scans**.

---

## 📌 Executive Summary & Technology Stack

| Layer | Technology | Primary Entry Points |
|:---|:---|:---|
| **Active Git Branch** | Git (`pharma_flow`) | Verified 0-error build pushed to `origin/pharma_flow` |
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
├── db.ts                          # MySQL pool creation, auto-migration, resetAndSeedDatabase(), wipeAllTables()
├── middleware/
│   └── auth.middleware.ts         # JWT authentication (requireAuth) & RBAC permission checks (requirePermission)
├── routes/
│   ├── index.ts                   # Master router combining all sub-routers
│   ├── pharma.routes.ts           # Doctors, Trade Entities, Workstation Daily Reports, 3D Detailing Products
│   ├── product.routes.ts          # Products, custom forms, onboarding items, types/categories, dependencies
│   ├── task.routes.ts             # Agile tasks, Sprints, Epics, Kanban status updates
│   ├── approval.routes.ts         # Workflows, multi-step approval requests, approver actions
│   ├── user.routes.ts             # User profiles, positions, roles, permissions, /reset-seed
│   ├── team.routes.ts             # Teams, team memberships, lead assignments
│   ├── performance.routes.ts      # KPI metric definitions and user metric scores
│   └── appreciation.routes.ts     # Peer appreciation feed and kudos sending
├── controllers/
│   ├── pharma.controller.ts      # Doctors, Trade network, Workstation daily reporting & 3D Detailing handlers
│   ├── product.controller.ts      # Request handlers for product definitions and onboarding
│   ├── approval.controller.ts     # Approval request creation and step decision handlers
│   ├── task.controller.ts         # Task CRUD and sprint management handlers
│   ├── user.controller.ts         # User profiles, roles, and permission handlers
│   ├── team.controller.ts         # Team management handlers
│   └── appreciation.controller.ts # Appreciation feed handlers
├── models/
│   ├── pharma.model.ts            # Doctors, Trade Entities, Workstation Daily Reports, getSubordinateUserIds()
│   ├── product.model.ts           # Product MySQL queries, item onboarding, cascade deletes
│   ├── approval.model.ts          # Multi-step approval progression & AUTOMATED ENTITY STATUS SYNC
│   ├── task.model.ts              # Sprint, Epic, Task MySQL queries & burndown telemetry
│   ├── user.model.ts              # Profile queries, user roles, positions
│   ├── team.model.ts              # Team and team member SQL operations
│   └── appreciation.model.ts      # Appreciation SQL queries with profile JOINs
└── utils/
    ├── response.ts                # Standardized JSON response wrapper (sendSuccess, sendError, AppError)
    └── index.ts                   # Helper functions (UUID crypto, async handlers)
```

---

### 2. Frontend Code Structure (`/frontend/src`)

```
frontend/src/
├── routes/
│   ├── __root.tsx                 # Root layout document, HTML theme class injector
│   ├── _authenticated.tsx         # Auth guard layout wrapper (redirects unauthenticated users to /auth)
│   └── _authenticated/
│       ├── doctors.tsx            # Doctors Management: Doctor DOBs, Spouse/Child DOBs, Special Days, Gifts, Reassignment
│       ├── trade.tsx              # Wholesale, Distributor & Chemists Management: DL, GST, Billing, Payment, Schemes
│       ├── workstation.tsx        # Employee Workstation & Reporting: Visit counters, Billing, Payments, Achievements
│       ├── detailing.tsx          # 3D Product Detailing & Visual Presentation: Interactive cards, MRP/PTR/PTS
│       ├── products/
│       │   └── index.tsx          # Master Products Surface: Define Product, Dynamic Form Builder, Onboard Record
│       ├── tasks.tsx              # Kanban Board, Sprint planning, Epic task filters, Burndown chart
│       ├── approvals.tsx          # Pending approvals review queue & action modal
│       ├── appreciation.tsx       # Kudos feed & peer recognition leaderboard
│       ├── performance.tsx        # Employee KPI scores and performance reviews
│       └── admin/
│           ├── team.tsx           # Team management & member allocations
│           ├── positions.tsx      # Job title definitions & department assignments
│           ├── users.tsx          # User accounts, role assignments, manager hierarchy
│           ├── flows.tsx          # Approval workflow builder
│           ├── approvals.tsx      # Admin global approval audit log
│           └── metrics.tsx        # System KPI metric configuration
├── components/
│   ├── admin-guard.tsx            # Admin sub-route protection guard (restricts non-admin access)
│   ├── app-sidebar.tsx            # Navigation sidebar with route links & theme selector
│   ├── theme-toggle.tsx           # Quick theme palette switcher
│   └── products/
│       ├── form-builder.tsx       # Drag/add custom field builder for product definitions
│       └── dynamic-form-renderer.tsx # Dynamic input renderer
├── lib/
│   ├── api-client.ts              # Fetch wrapper with Authorization bearer token & error handling
│   ├── pharma.functions.ts        # TanStack server functions for Doctors, Trade, Workstation & 3D Detailing
│   ├── products.functions.ts      # TanStack server functions for Product API calls
│   ├── tasks.functions.ts         # TanStack server functions for Tasks/Sprints API calls
│   ├── approvals.functions.ts     # TanStack server functions for Approval API calls
│   ├── admin.functions.ts         # TanStack server functions for User/Team/Position API calls
│   └── performance.functions.ts   # TanStack server functions for Appreciations/Metrics API calls
└── hooks/
    └── use-my-access.ts           # Permission & role access hook
```

---

## 🗄️ Database Tables & Key Foreign Keys

| Table Name | Primary Key | Description & Key Columns |
|:---|:---|:---|
| `profiles` | `id` | Extended Employee Schema across 8-tier Pyramid. Columns: `full_name`, `avatar_url`, `department`, `position_id`, `manager_id`, `designation`, `area`, `office_number`, `personal_number`, `emergency_family_number`, `referrals_contact`, `official_email`, `personal_email`, `residential_address`, `id_documents_url`, `bank_details_url`, `official_id_no`. |
| `doctors` | `id` | Doctor master data. Columns: `name`, `department`, `area_locality`, `whatsapp_contact`, `dob`, `spouse_dob`, `anniversary_date`, `child_dobs` (JSON), `special_day`, `gift_accepted_details`, `created_by`, `assigned_to`. |
| `trade_entities` | `id` | Trade firm master data. Columns: `category` (`chemist`\|`wholesaler`\|`distributor`), `firm_name`, `drug_license_no`, `gst_number`, `address`, `proprietor_name`, `contact_number`, `email`, `comm_modes`, `billing_details`, `payment_details`, `offer_scheme_details`, `created_by`, `assigned_to`. |
| `daily_reports` | `id` | Workstation daily activity logs. Columns: `user_id`, `report_date`, `doctor_visits_count`, `chemist_visits_count`, `wholesale_visits_count`, `distributor_visits_count`, `billing_amount`, `payment_amount`, `offers_distributed`, `special_achievements`, `notes`. |
| `pharma_products` | `id` | Pharmaceutical 3D Visual Detailing catalog (`/detailing`). Columns: `name`, `composition`, `category`, `packaging`, `mrp`, `ptr`, `pts`, `image_url`, `detailing_presentation_url`, `key_benefits` (JSON), `active_promotional_scheme`. |
| `products` | `id` | Dynamic Form Builder & Entity Onboarding templates (`/products`). Columns: `name`, `slug`, `product_type`, `category`, `form_schema` (JSON), `approval_settings` (JSON), `created_by`. |
| `product_items` | `id` | Onboarded record instances. Columns: `product_id`, `item_name`, `status` (`pending_approval`\|`onboarded`\|`rejected`), `approval_request_id`, `custom_fields` (JSON). |
| `approval_workflows` | `id` | Workflow definitions. Columns: `name`, `entity_type`, `active`. |
| `approval_steps` | `id` | Multi-stage steps. Columns: `workflow_id`, `step_order`, `approver_type`, `approver_ref`. |
| `approval_requests` | `id` | Pending & historical approval requests. Columns: `workflow_id`, `requester_id`, `entity_type`, `entity_id`, `status`, `current_step_order`. |
| `approval_actions` | `id` | Audit trail of approver decisions. Columns: `request_id`, `approver_id`, `step_order`, `decision`, `note`. |
| `sprints` | `id` | Agile Sprints. Columns: `name`, `goal`, `status`, `start_date`, `end_date`, `target_points`, `completed_points`. |
| `epics` | `id` | Agile Epics. Columns: `name`, `description`, `status`, `team_id`. |
| `tasks` | `id` | Agile tasks. Columns: `title`, `status`, `points`, `assignee_id`, `epic_id`, `sprint_id`, `team_id`. |
| `user_roles` | `id` | User role mapping (`super_admin`, `admin`, `director`, `gm`, `rm`, `bm`, `sm`, `am`, `smr`, `mr`). |
| `teams` | `id` | Teams. Columns: `name`, `description`, `lead_id`. |

---

## ⚡ Core Operational Data Flows

### 1. Senior Pyramid Hierarchy Data Visibility Flow (`getSubordinateUserIds`)
```
[User Requests /api/pharma/doctors or Reports]
       │
       ▼
1. Is User Root Admin / Director / Chairman?
       │
       ├─► YES: Return ALL records across the organization.
       │
       └─► NO: Execute PharmaModel.getSubordinateUserIds(userId)
             - Recursively walk down the `profiles.manager_id` tree.
             - Collect User ID + all direct/indirect subordinate IDs.
             - Return records where created_by IN (subordinates) OR assigned_to IN (subordinates).
```

### 2. Product Onboarding & Approval Entity Synchronization Flow
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
