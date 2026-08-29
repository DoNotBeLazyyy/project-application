# GEMINI.md — Arellano University LMS (AU-JAS) Codebase Guide

## 1. Executive Overview & Paradigm

This repository contains the complete frontend, database schema specifications, and Edge Function code for the **Arellano University (Jose Abad Santos Campus) Learning Management System (AU-JAS LMS)**.

### Core Architectural Principle: Thick Database, Thin Client
The system is architected around a strict **"Thick Database, Thin Client"** paradigm:
- **Presentation Layer Only**: The React frontend is exclusively a presentation and input capture layer.
- **Database-Enforced Business Logic**: All business rules, aggregations, grade computations, GPA/GWA calculations, status transitions, psychometric item analysis, prerequisite checks, and transactional integrity live directly in PostgreSQL stored procedures (`fn_*`).
- **Data Access Layer**: All client database interactions route through standardized service wrappers (`callRpc`, `callQuery`, `callSingle`) in `@services/supabase.wrapper.ts`. Direct `supabase.from()` table queries outside `@services/` are forbidden.
- **Server-Side Security**: Route guards in React provide UX convenience; actual data security is enforced at the database level via PostgreSQL Row Level Security (RLS) and role assert guards (`fn_assert_role`, `fn_assert_section_staff`).

---

## 2. Technology Stack

| Layer | Technology | Version / Specification |
|---|---|---|
| **Frontend Framework** | React + TypeScript | React 18, Strict TypeScript (`tsc -b`) |
| **Build Tooling** | Vite | Vite 6 |
| **UI Components** | MUI (Material-UI) | MUI v7 (Theme-driven, customized via `@constants/theme/`) |
| **Layout & Typography** | Tailwind CSS | Tailwind CSS v4 (HTML native tags + Tailwind utilities) |
| **State Management** | Zustand | Zustand v5 with `persist` middleware for session/role |
| **Forms & Validation** | React Hook Form | `react-hook-form` + `ValidCommonInput` wrappers |
| **Data Grids / Tables** | AG Grid | AG Grid Community with `CommonTableCard` wrapper |
| **Icons** | Phosphor Icons | `@phosphor-icons/react` |
| **Routing** | React Router | `react-router-dom` v7 |
| **Backend & DB** | Supabase / PostgreSQL | PostgreSQL 17+, Auth, Storage, Edge Functions |
| **AI Assistant** | Google Gemini | Gemini 2.5/Flash invoked via Supabase Edge Function (`ai-assistant`) |

---

## 3. Repository Directory Structure

```text
├── .claude/                  # Claude configuration & local settings (archived)
├── docs/
│   ├── sql/                  # Authoritative cumulative PostgreSQL migration scripts (47+ files)
│   └── (docs subfolders)     # Documentation & domain specs
├── public/                   # Static assets, logos, favicon
├── src/
│   ├── assets/               # (@assets) Images, brand assets, AU logo
│   ├── components/           # (@components) Reusable UI library (zero business logic)
│   │   ├── badge/            # CommonBadgeState, CommonBadgeStatus, CommonChip
│   │   ├── button/           # CommonButton, action buttons
│   │   ├── card/             # CommonCard, metric widgets
│   │   ├── form/             # FormErrorSummary, form layouts
│   │   ├── input/            # ValidCommonInput, CommonSelect, CommonTextarea
│   │   ├── modal/            # CommonModal, CommonActionModal, ConfirmPromptModal, DeletePromptModal
│   │   ├── navbar/           # CommonNavbar, notification bell, user avatar menu
│   │   ├── pagination/       # CommonPagination
│   │   ├── sidebar/          # CommonSideBar, role switcher
│   │   ├── table/            # CommonTable (AG Grid wrapper)
│   │   └── table-card/       # CommonTableCard (encapsulated CRUD table with filters, search, modals)
│   ├── constants/            # (@constants) Theme tokens, navigation configs, enums
│   ├── contexts/             # (@contexts) React context providers
│   ├── hooks/                # (@hooks) Custom React hooks (table configs, queries)
│   ├── pages/                # (@pages) Role-specific and shared screen components
│   │   ├── admin/            # Admin pages (Users, School Years, Terms, Grading Config, Settings)
│   │   ├── dean/             # Dean pages (Departments, Programs, Courses, Curriculum Maps, Sections)
│   │   ├── registrar/        # Registrar pages (Student Registry, Records, Enrollments, Grade Release)
│   │   ├── faculty/          # Faculty pages (My Sections, Section Detail [8 tabs], Assessment Builder)
│   │   ├── student/          # Student pages (Dashboard, Schedule, Subjects, Assessments, Grades)
│   │   ├── shared/           # Shared pages (Login, Set Password, Profile, Announcements, Events, Error)
│   │   └── unauthorized/     # 403 / Access Denied fallback
│   ├── routes/               # (@routes) AppRouter, AuthGuard, RoleGate, RoleRedirect
│   ├── services/             # (@services) ALL Supabase calls & business API wrappers
│   │   ├── supabase.client.ts   # Anon client for authenticated user operations
│   │   ├── supabase.admin.ts    # Service role client (user provisioning)
│   │   ├── supabase.wrapper.ts  # Standardized callRpc, callQuery, callSingle, callFunction
│   │   └── *.service.ts         # Domain services (admin, dean, faculty, student, term, user, etc.)
│   ├── stores/               # (@stores) Zustand state stores (app.store, loading.store, etc.)
│   ├── types/                # (@type) TypeScript interfaces and DTOs
│   └── utils/                # (@utils) Pure helper functions (error parsing, formatting, date utils)
├── supabase/
│   ├── functions/            # Supabase Edge Functions (ai-assistant with Gemini integration)
│   └── config.toml           # Supabase CLI configuration
├── supabase_ai_context.sql   # Point-in-time reference database snapshot (Frozen, do not edit)
├── seed_crowsnight.sql       # Seed test data for accounts and student portal
├── package.json              # Dependencies and npm scripts
├── tsconfig.json             # TypeScript compiler configuration (Path aliases)
└── vite.config.ts            # Vite configuration
```

---

## 4. Path Aliases & Import Contract

Relative imports (`../` or `./`) are strictly forbidden. All modules must use defined TypeScript path aliases:

| Alias | Target Path | Responsibility |
|---|---|---|
| `@assets` | `src/assets` | Static assets, icons, AU branding |
| `@components` | `src/components` | Presentation components; no Supabase or store write calls |
| `@constants` | `src/constants` | Theme palettes, static option lists, navigation definitions |
| `@contexts` | `src/contexts` | React Context definitions |
| `@hooks` | `src/hooks` | Reusable React hooks & AG-Grid configurations |
| `@pages` | `src/pages` | Route-level views composing components and invoking `@services` |
| `@routes` | `src/routes` | React Router route tree and guard gates |
| `@services` | `src/services` | Sole location for database and backend API communication |
| `@stores` | `src/stores` | Zustand state stores (persisted auth, active role, loading state) |
| `@type` | `src/types` | TypeScript interfaces, RPC request/response DTOs, Enums |
| `@utils` | `src/utils` | Pure functions (date formatting, error parsers, math helpers) |

---

## 5. Authentication, RBAC & Role Lifecycle

### Multi-Role Support & Single Responsibility
The LMS enforces strict **Single Responsibility** across five distinct user roles. Users can possess multiple roles simultaneously, switching active context via the sidebar **Role Switcher**.

```
                           ┌────────────────────────┐
                           │   Supabase Auth / JWT  │
                           └───────────┬────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │   public.users (Status)   │
                         └─────────────┬─────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼               ▼              ▼
   ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐    ┌─────────┐
   │  Admin  │    │  Dean   │    │ Registrar │    │ Faculty │    │ Student │
   └─────────┘    └─────────┘    └───────────┘    └─────────┘    └─────────┘
```

1. **Admin (`/admin`)**: System administration, user accounts & provisioning, school years, terms, term types, global grading templates & transmutation scales, system configuration.
2. **Dean (`/dean`)**: Academic department structure, degree programs & year levels, course catalog & prerequisite trees, curriculum maps, section creation & faculty assignment.
3. **Registrar (`/registrar`)**: Student master registry, section enrollments, academic clearance, student records/transcripts, official final grade releases.
4. **Faculty (`/faculty`)**: Instructional management of assigned sections, attendance sessions & records, continuous grading sheet, assessment creation & rubric evaluation, learning material uploads.
5. **Student (`/student`)**: Course schedule, enrolled subject portals, online assessment taker with countdown timer, view grades & feedback, faculty evaluations, curriculum audit progress.

### Auth & Onboarding Flow
- **User Provisioning**: Admin creates user via `fn_provision_single_user` or bulk CSV upload `fn_bulk_provision_users`. Supabase Auth sends an invitation email.
- **Onboarding Gate (`Invited` status)**: New accounts have status `'Invited'`. The `AuthGuard` traps any user with status `'Invited'` on `/set-password` until their initial password is set. Once completed, status flips to `'Active'`.
- **Session Rehydration**: On app launch, `App.tsx` calls `initAuthSession()` to restore JWT, query `public.users` profile, and populate `availableRoles` in `useAppStore`.

---

## 6. Service Layer & Database Contract

### Standardized Service Wrappers (`@services/supabase.wrapper.ts`)
Every service returns `ServiceResult<T>`:
```typescript
export interface ServiceResult<T> {
    data: T | null;
    error: ServiceErrorProps | null;
}
```

1. **`callRpc<T>(fnName, params)`**: Calls PostgreSQL function `supabase.rpc(fnName, params)`.
   - Inspects response payload for `{ success: false, message }` to show warning/error toast.
   - Inspects response payload for `{ success: true, message }` to show success toast.
   - Handles global loading spinner automatically via `useLoadingStore`.
   - Correctly differentiates business `403` / `42501` (shows toast) from expired sessions (redirects to `/login`).
2. **`callQuery<T>(queryBuilder)`**: Executes Supabase table queries returning arrays `T[]`.
3. **`callSingle<T>(queryBuilder)`**: Executes single-record queries returning `T`.
4. **`callFunction<T>(fnName, body)`**: Invokes Supabase Edge Functions (e.g. `ai-assistant`).

### Standardized Database Pagination (`CommonListResDto<T>`)
All list-fetching RPCs follow the PostgreSQL pagination wrapper `fn_build_pageable_dto`:
- Input: `p_page` (1-indexed from UI, translated to 0-indexed in DB), `p_size`, `p_search`, `p_sort_col`, `p_sort_dir`.
- Output: Standard JSONB envelope containing `items: T[]`, `totalElements: number`, `totalPages: number`, `pageNumber: number`, `pageSize: number`.

---

## 7. Major System Subsystems

### 1. Assessment Engine (`/faculty/sections/:id?tab=assessments` & `/student/assessments/:id`)
- **Question Types**: Multiple Choice, True/False, Short Answer, Essay, Fill in the Blank, Matching, File Upload.
- **Scheduling & Access Control**: Validates `scheduled_publish_at`, `opens_at`, `due_at`, `closes_at`, and `show_results_at`.
- **Server-Side Answer Key Withholding**: The answer key and `choices[].is_correct` are hidden in PostgreSQL via `CASE WHEN v_results_available THEN ... ELSE NULL END`. Students cannot inspect responses in browser devtools.
- **Timer Session & Auto-Submit**: Managed server-side via `assessment_timer_sessions` and heartbeat checks.
- **Psychometric Item Analysis**: PostgreSQL computes Classical Test Theory metrics: Difficulty Index ($p$-value) and Discrimination Index ($D$) for continuous exam quality evaluation.

### 2. Grading Engine & Transmutation (`/admin/grade-configurations` & `/faculty`)
- **Grading Periods**: Configurable templates (Prelim, Midterm, Semi-Finals, Finals) whose total weights must equal 100%.
- **Grading Components**: Written Works, Performance Tasks, Periodic Exams with weights totaling 100%.
- **Transmutation Ladder**: Configurable conversion scale translating raw percentage (0–100%) to institutional grades (1.00 to 5.00, or INC/DRP).
- **Grading Lock**: Once grades are submitted to Registrar, faculty editing is locked to prevent unauthorized tampering.

### 3. Learning Analytics & AI Assistant (`/supabase/functions/ai-assistant`)
- **PostgreSQL Analytics Functions**: Compute real-time GWA, honours eligibility status, student at-risk risk score (combining academic grades, attendance percentage, and missing assignments).
- **AI Integration**: Edge function connects to Google Gemini using a single read-only `SECURITY INVOKER` database context procedure (`fn_get_assistant_context`).
- **Safety Guarantee**: The AI model has zero direct write privileges; all answers are grounded in pre-computed SQL facts.

---

## 8. Database Source of Truth Hierarchy

When resolving database schemas, functions, triggers, and types, adhere strictly to this hierarchy:

1. **`docs/sql/*.sql` (Top Priority)**: The cumulative, authoritative source of truth for all tables, columns, enums, RLS policies, and RPC definitions.
2. **`supabase_ai_context.sql` (Secondary)**: Frozen point-in-time PostgreSQL 17 dump. Useful as a baseline structure for tables and enums, but lacks the ~100 latest RPCs defined in `docs/sql/`. Never execute this file as a migration.
3. **Live Database (Supabase)**: Currently managed by applying scripts from `docs/sql/` manually.

---

## 9. Developer Commands & Workflows

| Action | Command | Note |
|---|---|---|
| **Start Development Server** | `npm run dev` or `npm run start-dev` | Uses `.env.dev` |
| **Start Production Preview** | `npm run start-prd` | Uses `.env.prd` |
| **Typecheck & Build (Dev)** | `npm run build-dev` | Runs `tsc -b` followed by `vite build --mode dev` |
| **Typecheck & Build (Prod)** | `npm run build-prd` | Runs `tsc -b` followed by `vite build --mode prd` |
| **Run Linter** | `npm run lint` | ESLint 9 Flat Config |
| **Fix Lint Issues** | `npm run lint:fix` | Runs autofix on ESLint rules |
| **Preview Built Artifact** | `npm run preview` | Serves `dist/` |

---

## 10. Key Engineering Conventions & Invariants

1. **No `any`**: All types, props, and RPC results must be explicitly typed in `src/types/`.
2. **No `console.log`**: Production logging is disallowed by ESLint (`no-console: error`). Use `parseServiceError` from `@utils/error.util.ts`.
3. **MUI vs Tailwind Separation**:
   - MUI components are used exclusively for **Interactive Controls** (`CommonButton`, `ValidCommonInput`, `CommonSelect`, `CommonModal`, `CommonCard`).
   - Tailwind CSS and plain semantic HTML tags (`<div>`, `<p>`, `<span>`, `<h1>`–`<h6>`) are used for **Layout and Typography**. Do not use `<Box>`, `<Typography>`, `<Stack>`, or `<Grid>`.
4. **Form Standards**: Form inputs must use `ValidCommonInput` or `Controller` with `CommonSelect`/`CommonTextarea`. Never use raw `register`. Every form must include `<FormErrorSummary />`.
5. **Database Idempotency**: All SQL scripts in `docs/sql/` must use idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`, etc.) with zero inline comments (`--` or `/* */`).

---

## 11. Proactive Background Task Management & Termination Protocol

1. **No Hanging Background Streams**: Long-running CLI tools (e.g. `vercel deploy`, `vercel env`, streaming logs, dev runners) that maintain open stdin/stdout listeners MUST NOT be left running in the background once the underlying job has finished.
2. **Proactive Remote Status Polling**: When launching cloud deployments or async tasks, immediately inspect log output or poll the target endpoint/API.
3. **Immediate Task Termination**: The exact instant a deployment or operation is verified as `READY`, `DONE`, or `SUCCESS`, immediately call `manage_task` with action `kill` to terminate the process, clean up open handles, and avoid blocking user workflows.
4. **Transparent Communication**: Never leave the user waiting indefinitely on passive background tasks without providing immediate real-time progress and closing finished tasks promptly.
5. **Real-Time 2-Minute Progress Updates**: During multi-step workflows or long-running tasks, continuously update the user on: (a) what is actively executing, (b) what specific command/action was attempted, and (c) the exact result or output of that attempt.



