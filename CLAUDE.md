# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Arellano University LMS: AI Rulebook.** Sections 0–11 are binding. Section 0 covers commands, environment, and runtime wiring; sections 1–11 are the coding standards you must follow exactly.

## 0. Commands, Environment & Runtime Wiring

### Commands
| Task | Command |
|---|---|
| Run dev server | `npm run dev` (or `npm run start-dev` for `.env.dev`, `npm run start-prd` for `.env.prd`) |
| Typecheck + build (dev) | `npm run build-dev` |
| Typecheck + build (prod) | `npm run build-prd` |
| Lint | `npm run lint` |
| Lint + autofix | `npm run lint:fix` |
| Preview built bundle | `npm run preview` |

- **`npm run build` runs `tsc -b` first** — the build is the typecheck. There is no separate `typecheck` script; run `npm run build-dev` to verify types.
- **There is no test runner configured.** No Jest/Vitest, no `*.test.ts` files. Do not invent test commands or assume tests exist — verify changes via the dev server and `build-dev`.
- ESLint flat config lives in `eslint.config.js`; Prettier config in `.prettierrc.json`. The strict style rules in sections 3 & 6 are enforced by these — run `lint:fix` before considering work done.

### Environment
- Vite loads env by `--mode`: `.env.dev` and `.env.prd` are the two mode files (no plain `.env`). Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`. The service-role key is used by `@services/supabase.admin.ts` for admin-only auth operations (user provisioning) — that module **throws at import time** when it is missing, which breaks user creation.
- Two Supabase clients exist: `supabase.client.ts` (anon, for normal calls) and `supabase.admin.ts` (service role, for `auth.admin.*`). Never use the admin client for regular data reads.

### Service Layer Contract (read before writing any service)
Every service call returns `ServiceResult<T>` = `{ data: T | null; error: ServiceErrorProps | null }` — never throw, never return raw Supabase responses, never use Axios DTOs. Route everything through the three wrappers in `@services/supabase.wrapper.ts`:
- `callRpc<T>(fn, params)` — for `supabase.rpc()`. Auto-shows toasts: it inspects the JSONB payload for `{ success: false, message }` (error toast) or `{ success: true, message }` (success toast). Design RPCs to return that shape when a user-facing message is wanted.
- `callQuery<T>(client => ...)` — returns `T[]` from a `.from().select()` chain.
- `callSingle<T>(client => ...)` — returns a single `T` (use with `.single()`).

All three manage the global `isLoading` via `useLoadingStore` and redirect to `/login` on 401/403. **Never call `setLoading`/`show`/`hide` yourself, and never build a `supabase.from()` chain outside a `@services` file.**

### Routing & Auth Flow
- `App.tsx` calls `initAuthSession()` once on mount to rehydrate `userProfile`/`availableRoles` from the persisted session (`@services/auth.service.ts`).
- Route tree (`@routes/AppRouter.tsx`): `BasePage` → public `login`/`set-password` → `AuthGuard` → `ProtectedLayout` → per-role subtrees each wrapped in `<RoleGate allowedRoles={[...]} />`. Role route files live in `src/routes/{admin,dean,registrar,faculty,student}/`.
- `AuthGuard` traps `userProfile.status === 'Invited'` on `/set-password` (the onboarding gate from §11). `RoleRedirect` sends the index route to the active role's home; `RoleGate` blocks and redirects to `/unauthorized`.
- Role subtrees map 1:1 to the RBAC boundaries in §10 — put a new page under the route folder for the single role that owns that capability.

## 1. Project Paradigm: Thick Database, Thin Client

The frontend is a **presentation layer only**. All business logic lives in PostgreSQL.

- **NEVER** perform filtering, aggregation, grade computation, status derivation, or multi-step transactions in the frontend.
- **ALWAYS** call PostgreSQL functions via `supabase.rpc()` for any operation beyond a simple CRUD read.
- The frontend receives pre-shaped data from the DB and renders it. Period.
- All Supabase calls are routed through the centralized wrappers in `@services/supabase.wrapper.ts` (`callRpc`, `callQuery`, `callSingle`). Direct `supabase.from().select()` chains outside of service files are forbidden.
- Loading state (`isLoading`) is managed exclusively by the wrapper — never call `setLoading` manually from a component or page.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite + TypeScript (strict mode) |
| UI Components | MUI v7 (theme-driven, custom overrides via `@constants/theme/`) |
| Layout | Tailwind CSS v4 (utility classes for spacing/layout ONLY, no color/typography) |
| State | Zustand v5 with `persist` middleware for `session` and `activeRole` |
| Backend | Supabase (PostgreSQL + Auth + RPC + Storage) |
| Forms | `react-hook-form` with `Controller` for all controlled inputs |
| Icons | `@phosphor-icons/react` exclusively — no MUI icons, no react-icons |
| Routing | `react-router-dom` v7 |
| i18n | `react-i18next` |

---

## 3. ESLint & Code Style — Non-Negotiables

### Formatting
- **Indentation**: 4 spaces. No tabs.
- **Quotes**: Single quotes for all JS/TS strings. Double quotes for JSX attribute strings.
- **Semicolons**: Always.
- **Trailing commas**: Never (`comma-dangle: never`).
- **End of file**: No newline at EOF (`eol-last: never`).
- **Brace style**: Stroustrup (`else` on new line after closing `}`).
- **Multiline ternary**: Always split ternary across lines.

### Functions & Components
- **`func-style: declaration`** — All top-level functions and React components must use `function` declarations. Arrow functions are forbidden for top-level logic and components.
- Arrow functions are permitted only for inline callbacks, array methods, and non-exported utility lambdas inside a function body.
- `forwardRef` wrappers are the only exception for component files that require ref forwarding.

### Imports & Paths
- **ZERO relative paths.** No `../`, `./`, or `..` anywhere.
- All imports must use the configured path aliases:

| Alias | Maps to |
|---|---|
| `@assets` | `src/assets` |
| `@components` | `src/components` |
| `@constants` | `src/constants` |
| `@contexts` | `src/contexts` |
| `@hooks` | `src/hooks` |
| `@locales` | `src/locales` |
| `@pages` | `src/pages` |
| `@routes` | `src/routes` |
| `@services` | `src/services` |
| `@stores` | `src/stores` |
| `@themes` | `src/themes` |
| `@type` | `src/types` |
| `@utils` | `src/utils` |

### Logging
- **`no-console` is enforced.** No `console.log`, `console.error`, or `console.warn` anywhere.
- Error handling must use `parseServiceError` from `@utils/error.util.ts` and return structured `ServiceErrorProps` objects. Silent returns are acceptable over console output.

### JSX
- Props must be sorted alphabetically (`react/jsx-sort-props`). Callback props last.
- Max 1 prop per line when multiline.
- First prop on new line when multiline.

### TypeScript
- **`any` is forbidden.** Every type must be explicit and specific.
- Use `interface` for object shapes, `type` for unions, intersections, and aliases.
- All Supabase RPC responses must be typed with a dedicated interface in `@type/`.

---

## 4. Component Reuse — Use Custom Components, Not Raw MUI

Always use the pre-built component library. Raw MUI primitives are forbidden where a custom wrapper exists.

| Use Case | Component | Import Path |
|---|---|---|
| **Form Input** | `ValidCommonInput` | `@components/input/ValidCommonInput`
| Form Error Summary | `FormErrorSummary` | `@components/form/FormErrorSummary` |
| Button | `CommonButton` | `@components/button/CommonButton` |
| Text Input | `CommonInput` | `@components/input/CommonInput` |
| Dropdown / Select | `CommonSelect` | `@components/input/CommonSelect` |
| Multiline Input | `CommonTextarea` | `@components/input/CommonTextarea` |
| Card | `CommonCard` | `@components/card/CommonCard` |
| Modal | `CommonModal` | `@components/modal/CommonModal` |
| Action Modal | `CommonActionModal` | `@components/modal/CommonActionModal` |
| Confirm Modal | `ConfirmPromptModal` | `@components/modal/ConfirmPromptModal` |
| Delete Modal | `DeletePromptModal` | `@components/modal/DeletePromptModal` |
| Typed Delete | `TypedDeleteModal` | `@components/modal/TypedDeleteModal` |
| Table | `CommonTable` | `@components/table/CommonTable` |
| Table Card | `TableCard` | `@components/table-card/TableCard` |
| Pagination | `CommonPagination` | `@components/pagination/CommonPagination` |
| Badge State | `CommonBadgeState` | `@components/badge/CommonBadgeState` |
| Badge Status | `CommonBadgeStatus` | `@components/badge/CommonBadgeStatus` |
| Chip | `CommonChip` | `@components/badge/CommonChip` |
| Sidebar | `CommonSideBar` | `@components/sidebar/CommonSideBar` |
| Stepper | `CommonStepper` | `@components/stepper/CommonStepper` |
| Tab Menu | `CommonTabMenu` | `@components/tab-menu/CommonTabMenu` |
| Progress Bar | `CommonProgressBar` | `@components/progress-bar/CommonProgressBar` |
| Navbar | `CommonNavbar` | `@components/navbar/CommonNavbar` |

### Form Standards
- **Standard:** Use `ValidCommonInput` for all form fields. It handles `useController` internally.
- **No Wrappers:** Do not manually wrap components in `<Controller>` or use `register`.
- **Error Handling:** Use the `formErrors` utility in the `onError` callback of `handleSubmit`. It focuses and scrolls to the first invalid field and dispatches the `FORM_ERROR_EVENT` DOM event, which `CommonToast` turns into a warning toast. It does not use `window.alert`.
- **Form-level summary:** Every form must render a `FormErrorSummary` (`@components/form/FormErrorSummary`), which lists every invalid field after a failed submit. `CommonForm` renders it automatically (`hasErrorSummary`, default `true`) — a form built on `CommonForm` needs nothing. A form that composes fields directly must place `<FormErrorSummary control={control} />` near its submit button. Focus alone is not feedback: `setFocus` is a no-op on a field that is unmounted or on an inactive tab.

### Component-Specific Rules

**`CommonSelect`**
- Never pass a `label` prop — it is internally forced to `""`. Place a `Typography` label above.
- Wire with `react-hook-form` via `Controller`: pass `field.value` and `field.onChange`.
- Options shape: `{ label: string; value: string | number }[]`.
- Defaults: `size="large"` `variant="outlined"`.

**`CommonTextarea`**
- Always pass controlled `value` + `onChange`. Character count is derived from `value` internally.
- `onChange` receives `ChangeEvent<HTMLInputElement | HTMLTextAreaElement>` — use `e.target.value`.
- Do not wrap in an external resizable container — resize is self-contained.
- Wire with `react-hook-form` via `Controller`: `field.value` → `value`, `field.onChange` → `onChange`, `field.ref` → `ref`.

**`react-hook-form` Pattern**
All form fields must use `Controller`. Never use `register` with custom components.

```tsx
<Controller
    control={control}
    name="fieldName"
    render={({ field }) => (
        <CommonSelect
            fullWidth
            options={options}
            value={field.value}
            onChange={field.onChange}
        />
    )}
/>
```

---

## 5. Database Non-Negotiables (PostgreSQL / Supabase)

All SQL generated or modified must comply with these rules without exception.

### Live Schema Reference — READ THIS FIRST

**`docs/sql/*.sql` is the source of truth for the database.** Every schema change and every RPC is authored as a script in that directory and applied manually to Supabase. The directory is cumulative — where the same `fn_*` is defined in more than one file, the newest definition is the live one.

**`supabase_ai_context.sql`** (repo root) is a point-in-time `pg_dump` (PostgreSQL 17.6) kept as a broad structural reference for tables, columns, and enums. It is **deliberately frozen and is never regenerated.** It is known to lag the live database — over 100 of the `fn_*` names the frontend calls do not appear in it at all. Never hand-edit it and never run it as a migration.

**Lookup order when checking whether an RPC, column, or enum value exists:**
1. `docs/sql/*.sql` — authoritative for everything, and the only reliable source for function signatures.
2. `supabase_ai_context.sql` — older baseline; useful for tables, columns, and enums, unreliable for functions.
3. If the two disagree, `docs/sql/` is correct.

Checking only the dump will produce wrong conclusions — it will tell you a function is missing a parameter, or missing entirely, when `docs/sql/` already defines it.

The frontend binds to these RPCs by name; adding a new RPC in a service means the corresponding `fn_*` must exist in the database, authored as a new `docs/sql/` script.

**Public schema surface (~55 tables, ~200 `fn_*` RPCs, 20 enums).** Tables grouped by owning role (§10):
- **Admin/system:** `users`, `user_roles`, `roles`, `school_years`, `terms`, `term_types`, `system_settings`, `notifications`
- **Dean/academic architecture:** `departments`, `programs`, `program_levels`, `courses`, `course_types`, `course_prerequisites`, `curriculum_maps`, `sections`, `section_schedules`
- **Registrar/records:** `enrollments`, `students`, `student_clearances`, `clearance_requirements`, `section_final_grades`, `grade_audit_logs`
- **Faculty/instruction:** `assessments` domain (`assessment_items`, `assessment_questions`, `assessment_question_choices`, `assessment_submissions`, `assessment_attachments`, `assessment_timer_sessions`, `assessment_timer_heartbeats`, `student_answers`), `attendance_sessions`, `attendance_records`, `grading_config`, `grading_components`, `grading_component_templates`, `grading_periods`, `grading_period_templates`, `grade_transmutation_tables`, `special_grade_configs`, `rubrics`, `rubric_criteria`, `rubric_evaluations`, `modules`, `course_materials`, `announcements`
- **Evaluation:** `evaluation_templates`, `evaluation_questions`, `evaluation_responses`, `evaluation_period_locks`
- **Student-facing prefs:** `student_section_colors`

**RPC naming conventions (match these — do not invent new shapes):**
- `fn_get_<entity>_by_id` / `fn_get_<entity>` — single-record or scalar reads
- `fn_list_<entity>_json` — paginated list, returns the `CommonListResDto`-shaped JSONB via `fn_build_pageable_dto` (§11). Accepts `p_sort_col` / `p_sort_dir` for dynamic sorting
- `fn_create_<entity>` / `fn_update_<entity>` / `fn_delete_<entity>` — single-record writes (soft delete)
- `fn_bulk_create_<entity>` / `fn_bulk_delete_<entity>` / `fn_bulk_provision_users` — array-payload transactional writes (§11)
- `fn_set_updated_audit()` — the shared audit trigger function attached to every table

**Enums (`CREATE TYPE public.*_type AS ENUM`):** `announcement_audience_type`, `assessment_type`, `attendance_status_type`, `audit_action_type`, `civil_status_type`, `clearance_status_type`, `day_of_week_type`, `enrollment_status_type`, `evaluation_question_type`, `faculty_status_type`, `gender_type`, `grade_status_type`, `material_type`, `prerequisite_type`, `question_type`, `section_status_type`, `student_status_type`, `submission_status_type`, `submission_timer_status`, `term_status_type`. Grep `docs/sql/` first, then the dump, for the exact allowed values before using one in a type or form — a value added after the snapshot was taken will only appear in `docs/sql/`.

### Primary Keys
Every table uses UUID: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.

### Global Audit Columns
Every table must include all six audit columns:
```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ,
deleted_at  TIMESTAMPTZ,
created_by  UUID DEFAULT auth.uid(),
updated_by  UUID,
deleted_by  UUID
```

### Trigger Automation
Every table must have the `fn_set_updated_audit()` trigger attached:
```sql
DROP TRIGGER IF EXISTS trg_{table}_updated_audit ON public.{table};
CREATE TRIGGER trg_{table}_updated_audit
    BEFORE UPDATE ON public.{table}
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();
```

### Soft Deletes
- Never use hard `DELETE`. All deletions set `deleted_at = now()`, `deleted_by = auth.uid()`.
- All SELECT RLS policies must filter `WHERE deleted_at IS NULL`.

### Partial Unique Indexes
Never use inline UNIQUE in `CREATE TABLE`. Always use:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uidx_{name}
    ON public.{table} ({columns})
    WHERE deleted_at IS NULL;
```

### Foreign Keys
Always declare `ON DELETE RESTRICT` on every foreign key.

### Idempotency
- Tables: `CREATE TABLE IF NOT EXISTS`
- Columns: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Policies: `DROP POLICY IF EXISTS "name" ON table;` before every `CREATE POLICY`
- Triggers: `DROP TRIGGER IF EXISTS` before every `CREATE TRIGGER`
- Functions: `CREATE OR REPLACE FUNCTION`
- Enums: wrap in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`

### Row Level Security
Every table must immediately enable RLS:
```sql
ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;
```
Every table must have explicit policies for `SELECT`, `INSERT`, and `UPDATE`. No table is ever left without policies.

### RPC First
Any operation involving computation, multi-table writes, or conditional logic must be a `CREATE OR REPLACE FUNCTION` callable via `supabase.rpc()`. The frontend calls, it does not compute.

### No SQL Comments
Zero `--` or `/* */` comments in any SQL output.

---

## 6. Token Efficiency — STRICT NO COMMENTS RULE

No comments of any kind in any generated output. This applies to:
- SQL files: no `--` or `/* */`
- TypeScript / TSX files: no `//` or `/* */`
- CSS / Tailwind classes: no inline comments
- Markdown documentation (except this file): no HTML comments

Code must be self-documenting through precise naming. If a name requires a comment to explain it, rename it instead.

---

## 7. File Structure

```text
src/
├── assets/           (@assets)
├── components/       (@components)  — reusable UI only, zero business logic
├── constants/        (@constants)  — theme tokens, MUI overrides, static config
├── contexts/         (@contexts)
├── hooks/            (@hooks)      — custom React hooks
├── locales/          (@locales)
├── pages/            (@pages)      — route-level components, thin wrappers
├── routes/           (@routes)
├── services/         (@services)   — ALL Supabase calls live here
├── stores/           (@stores)     — Zustand stores only
├── themes/           (@themes)
├── types/            (@type)       — all TypeScript interfaces and types
└── utils/            (@utils)      — pure functions, no side effects
```

### Separation of Concerns
- **`@services`** — every Supabase call (`callRpc`, `callQuery`, `callSingle`). Nothing else.
- **`@stores`** — Zustand state and actions. No async calls, no Supabase imports.
- **`@components`** — pure UI. No supabase imports. No store writes except loading.
- **`@pages`** — composes components. Calls service functions. Reads from stores.
- **`@utils`** — pure functions only. No imports from `@stores` or `@services`.

---

## 8. Auth & Role Switching

- Auth session is persisted in `useAppStore` (`@stores/app.store.ts`) via Zustand persist.
- `session` and `activeRole` survive page refresh. `userProfile` and `availableRoles` are rehydrated on app mount via `initAuthSession()` from `@services/auth.service.ts`.
- Users can hold multiple roles: Admin, Faculty, Student, Registrar, Dean.
- The active role is resolved by `resolveActiveRole()` — if the persisted `activeRole` is still in `availableRoles`, keep it. Otherwise default to `availableRoles[0]`.
- Role switching is exposed via a `CommonSelect` in the sidebar. On change, call `useAppStore.getState().setActiveRole(role)`.
- All sidebar navigation, page guards, and conditional UI must read `activeRole` from the store — never re-derive it from the session or profile.

## 9. UI & Layout Standards (MUI vs. Tailwind)
### Component Split
- **MUI:** Used ONLY for **Interactive Components** (Inputs, Buttons, Cards, Modals).
- **HTML + Tailwind:** Used for all **Layout and Text**.

### Typography & Layout Rules
- **FORBIDDEN:** `<Typography>`, `<Box>`, `<Stack>`, `<Grid>`.
- **MANDATORY:** Use standard HTML tags (`<h1>`-`<h6>`, `<p>`, `<span>`, `<div>`).
- **Styling:** Use Tailwind CSS for all font sizes, weights, and layouts.
- **Theme Colors:** Use MUI CSS variables:
    - Text: `text-[var(--mui-palette-text-primary)]`
    - Primary: `text-[var(--mui-palette-primary-main)]`
    - Error: `text-[var(--mui-palette-error-main)]`
- **Layouts:** Use Tailwind Flex (`flex`) or Grid (`grid`).

## 10. Role-Based Access Control (Single Responsibility)
The system strictly enforces Single Responsibility. Roles must not overlap in functionality in the UI. If a user needs multiple capabilities, they are assigned multiple roles and must switch between them using the Role Switcher.

* **Admin (System & Infrastructure):** Manages `users`, `user_roles`, `school_years`, `terms`, and global system settings. (No access to academic curriculum or student records).
* **Dean (Academic Architecture):** Manages `departments`, `programs`, `courses`, `curriculum_maps`, and assigns faculty to sections.
* **Registrar (Student & Records):** Manages `enrollments`, `student_clearances`, official student rosters, and final grade releases.
* **Faculty (Instructional):** Manages assigned `sections`, attendance, grading, and assessments.
* **Student (Learning):** Views schedules, submits assessments, and checks grades/clearances.

## 11. The Thick DB CRUD Standard (Foundational Architecture)
All major management screens must follow the "Thick DB" CRUD pattern, centralizing business logic in PostgreSQL:

* **Multi-Table Writes:** Operations that affect multiple tables (e.g., Auth + Public profiles + Role-specific tables) MUST be handled by a single PostgreSQL RPC (e.g., `fn_provision_single_user`). The frontend only calls this RPC.
* **Auth Syncing:** Creating users utilizes Supabase `auth.admin.inviteUserByEmail()`. The UI must track the invitation state and provide a "Resend Invite" row action.
* **Bulk Operations (Delete):** `CommonTable` (AG Grid) checkboxes must be enabled for bulk selection. Deletions must send an array of UUIDs to a single RPC (e.g., `fn_bulk_delete_users`) for transaction-safe soft deletes.
* **Bulk Operations (Create/Update):** Management screens must provide "Download CSV Template" and "Upload CSV" actions. The frontend parses the CSV to a JSON array and passes the payload to a bulk RPC (e.g., `fn_bulk_provision_users`) to handle the loop on the server side.
* **Strict Onboarding Gate:** The `public.users` table must track a status ('Invited' or 'Active'). If a user authenticates but their profile status is 'Invited', the frontend router (AuthGuard) must aggressively trap them on the `/set-password` page.
* **Invitation Resend Logic:** If an invite needs to be resent to an existing email, use the password recovery flow via `supabase.auth.resetPasswordForEmail()` to securely trigger a fresh setup link.
* **Database Pagination Wrapper:** All list-fetching RPCs MUST return a `JSONB` payload formatted exactly like the Spring Boot `CommonListResDto<T>`. This is achieved by passing the base query to a centralized PostgreSQL wrapper function (`fn_build_pageable_dto`). The frontend service layer simply returns this JSONB directly.
* **Zero-Indexed Pages:** The UI is 1-indexed, but the `CommonListResDto` DTO `number` and `pageNumber` properties generated by the DB must strictly be 0-indexed.
* **Dynamic RPC Sorting:** RPC functions handling lists must accept `p_sort_col` (TEXT) and `p_sort_dir` (TEXT) to apply dynamic `ORDER BY` clauses using secure dynamic SQL (`EXECUTE format(...)`).
* **CommonTableCard Encapsulation (God Component):** `CommonTableCard` MUST internally manage the state (`isOpen`) for Create, Filter, and Sort modals. It handles the pagination layout and controls internally.
* **Property Injection over Callbacks:** `CommonTableCard` must accept a `controls: Partial<TableCardControlsProps>` prop containing `tableInputProps` and `tableButtonsProps` (which use `CommonButtonProps`). It MUST NOT use loose `onClick` props.
* **Parent Pages:** Parent pages (like `UsersPage`) MUST NOT manage modal states or render loose Action Modals. They must pass the form contents via props like `createModalContent` directly into `CommonTableCard`.
* **Service Responses:** Never use Axios DTOs (`Promise<AxiosResponse>`). Use the internal `ServiceResult<T>` pattern.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five canonical triage roles with default strings (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.