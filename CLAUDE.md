# CLAUDE.md — Arellano University LMS: AI Rulebook

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
- **Error Handling:** Use the `formErrors` utility in the `onError` callback of `handleSubmit`. It handles `window.alert` and automatic focus.

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