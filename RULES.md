# RULES.md — Coding Standards & Engineering Rules

This document outlines the non-negotiable coding standards, ESLint conventions, database guidelines, and architecture rules for the Arellano University LMS (AU-JAS).

---

## 1. Architectural Paradigm: Thick Database, Thin Client

1. **Presentation Layer Only**: The frontend never calculates grades, aggregates statistics, filters permissions, or manages multi-step database transactions.
2. **PostgreSQL RPCs First**: Any multi-table write, status derivation, GPA/GWA calculation, or psychometric analysis must be executed inside PostgreSQL via a stored procedure (`fn_*`).
3. **No Direct Queries in UI**: All Supabase interactions must be encapsulated inside `@services/*.service.ts` using the standard wrappers in `@services/supabase.wrapper.ts` (`callRpc`, `callQuery`, `callSingle`).
4. **Automated Loading State**: Never invoke `setLoading`, `showLoading`, or manual spinner states in components. The service wrapper manages `useLoadingStore` automatically.

---

## 2. ESLint, Formatting & TypeScript Standards

### Code Formatting
- **Indentation**: 4 spaces strictly. No tabs.
- **Quotes**: Single quotes for all TypeScript/JavaScript strings (`'example'`). Double quotes for JSX attributes (`prop="value"`).
- **Semicolons**: Mandatory after every statement.
- **Trailing Commas**: Never (`comma-dangle: never`).
- **End of File**: No trailing newline at EOF (`eol-last: never`).
- **Brace Style**: Stroustrup brace style (`else` placed on a new line after closing brace `}`).

### Functions & Component Declarations
- **Top-Level Function Declarations**: All top-level React components and exported functions must use `function` syntax (`export function MyComponent() { ... }`). Arrow functions (`const MyComponent = () => { ... }`) are forbidden for top-level declarations.
- **Arrow Functions**: Permitted only for inline callbacks, array iterators (`map`, `filter`), and non-exported inner utility lambdas.
- **`forwardRef` Exception**: Permitted only when explicit ref forwarding is required.

### TypeScript & Typing
- **`any` is Forbidden**: All types must be explicitly declared and strongly typed.
- **Interfaces vs Types**: Use `interface` for object structures and component props; use `type` for unions, intersections, and aliases.
- **RPC DTOs**: Every Supabase RPC return value must have an explicit interface defined in `src/types/`.

### Logging & Error Handling
- **Zero `console.log`**: Production code must not contain `console.log`, `console.warn`, or `console.error`.
- **Structured Error Parsing**: Use `parseServiceError` from `@utils/error.util.ts` to return standard `ServiceErrorProps`.

### Imports & Absolute Path Aliases
- **No Relative Imports**: Paths starting with `./` or `../` are forbidden.
- Always use the registered TypeScript aliases:
  - `@assets`, `@components`, `@constants`, `@contexts`, `@hooks`, `@pages`, `@routes`, `@services`, `@stores`, `@type`, `@utils`.

---

## 3. UI, Styling & Component Reuse Standards

### MUI vs Tailwind CSS Separation
- **Interactive Components (MUI only)**: Use custom wrappers from `@components/` (`CommonButton`, `ValidCommonInput`, `CommonSelect`, `CommonModal`, `CommonCard`, `CommonTableCard`).
- **Layout & Typography (Tailwind CSS only)**:
  - **FORBIDDEN**: `<Typography>`, `<Box>`, `<Stack>`, `<Grid>` from MUI.
  - **MANDATORY**: Semantic HTML tags (`<h1>`–`<h6>`, `<p>`, `<span>`, `<div>`, `<section>`) styled with Tailwind classes.
  - **Theme Variables**: Use MUI CSS variables for colors (e.g., `text-[var(--mui-palette-text-primary)]`, `bg-[var(--mui-palette-primary-main)]`).

### Form Standards
- **Form Controls**: Use `ValidCommonInput` for text/number fields. Use `Controller` from `react-hook-form` with `CommonSelect` or `CommonTextarea`.
- **Form Error Summary**: Every form must render `<FormErrorSummary control={control} />` or use `CommonForm` to ensure accessible and visible error feedback.
- **No Alerts**: Do not use `window.alert()` or browser popups.

---

## 4. Database (PostgreSQL / Supabase) Rules

### Source of Truth
- **`docs/sql/*.sql`** is the primary, authoritative source of truth for all database changes.
- **`supabase_ai_context.sql`** is a frozen reference dump and must never be edited or run as a migration.

### Table & Column Conventions
- **Primary Keys**: Always UUID: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Global Audit Columns**: Every table must include:
  ```sql
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,
  created_by  UUID DEFAULT auth.uid(),
  updated_by  UUID,
  deleted_by  UUID
  ```
- **Audit Trigger**: Every table must have `fn_set_updated_audit()` attached.
- **Soft Deletes**: Deletes set `deleted_at = now()`, `deleted_by = auth.uid()`. All SELECT queries and RLS policies must filter `WHERE deleted_at IS NULL`.
- **Foreign Keys**: Always declare `ON DELETE RESTRICT` on foreign keys.
- **Partial Unique Indexes**: Use `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL` instead of inline `UNIQUE` constraints.
- **Security & RLS**: Every table must enable RLS. Every security-critical RPC must verify caller permissions using `fn_assert_role` or `fn_assert_section_staff`.
- **Zero SQL Comments**: No `--` or `/* */` comments in any generated SQL scripts.

