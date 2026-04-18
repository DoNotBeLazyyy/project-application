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