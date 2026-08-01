<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# 🤖 AI Assistant Navigation & System Guidelines

Welcome AI Coding Assistant! To understand this repository instantly without doing wasteful full-codebase directory scans:

## 📌 Recent System Additions & Current Working Branch
- **Active Git Branch**: `pharma_flow` (All recent features, schema changes, and 0-error builds are pushed to `origin/pharma_flow`).
- **8-Tier Working Pyramid Hierarchy**: Director / Chairman (Level 0) → General Manager (Level 1) → Regional Manager (Level 2) → Business Manager (Level 3) → Sales Manager (Level 4) → Area Manager (Level 5) → Sr. Medical Representative (Level 6) → Medical Representative (Level 7).
- **Pharma Domain Operational Modules**:
  - 🩺 **Doctors Management** (`/doctors`): Doctor details, special days, gift tracking, family DOBs, and Senior Pyramid Visibility Control.
  - 🏪 **Trade & Chemists Network** (`/trade`): Chemists, Wholesalers, Distributors with Drug License No., GST, Proprietor details, and Active Schemes.
  - 💼 **Employee Workstation** (`/workstation`): Daily field activity reporting, visit counts, collections, billing, and achievements.
  - ✨ **3D Product Detailing** (`/detailing`): Interactive 3D visual detailing cards, MRP/PTR/PTS pricing, and clinical evidence.

---

## 📚 Core System Architecture Documents

1. Read **[`ARCHITECTURE.md`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/ARCHITECTURE.md)**:
   - Complete directory index mapping every module, route, model, controller, component, and utility.
   - Database schema tables, foreign keys, and Working Pyramid hierarchy.
   - Core operational data flows and AI developer best practices.

2. Read **[`BACKEND_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/BACKEND_ARCHITECTURE.md)**:
   - Deep backend analysis & architectural diagrams.
   - Exhaustive catalog of **every REST API endpoint** including `/api/pharma/doctors`, `/api/pharma/trade-entities`, `/api/pharma/daily-reports`, `/api/pharma/pharma-products`.
   - Senior Pyramid Hierarchy recursive visibility filtering algorithm (`getSubordinateUserIds`).

3. Read **[`RBAC.md`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/RBAC.md)**:
   - Master Role-Based Access Control (RBAC) matrix and 8-tier hierarchy rules.
   - Seeded user credentials across all 8 pyramid levels.
   - Frontend `AdminGuard` component and permission middleware (`requireAuth`, `requirePermission`).

4. Read **[`REPORT.md`](file:///c:/Users/user/Desktop/bmsmomentum/bmsmomentum-1df74f9a/REPORT.md)**:
   - Master system workflow map and Mermaid architecture diagrams.
   - Database reset and complete seeding log (`resetAndSeedDatabase()`).
   - Bug and loophole audit report.
