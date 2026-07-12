# Plan: Create CLAUDE.md

## Context
This repo (`hris-web`) has no `CLAUDE.md`, no Cursor/Copilot rules, and only a placeholder GitLab README. Future Claude Code instances need a concise orientation file capturing the build/lint commands, the strict ESLint conventions (which are unusual and easy to violate), and the layered feature architecture that spans many directories.

The deliverable is a single new file: `CLAUDE.md` at the repo root.

## Key findings driving the content
- **Stack**: React 18 + TypeScript + Vite SPA. MUI v7 (Emotion) + Tailwind CSS v4 hybrid styling, Zustand state, react-router-dom v7, react-hook-form, react-i18next (en/ko), ag-grid tables.
- **No test framework** is configured. Lint is `eslint src`.
- **Builds** run `tsc -b` before `vite build` (mode-specific via `.env.dev` / `.env.prd`). Dev server is port 3000 with a `/hris-api` proxy.
- **Path aliases** (`@components`, `@hooks`, `@services`, `@type`, etc.) are enforced — relative parent imports are an ESLint *error*.
- **Strict ESLint** rules that materially affect generated code: 4-space indent, single quotes, required semicolons, `func-style: declaration` (no arrow-function declarations), `no-console: error`, `eol-last: never` (no trailing newline), Stroustrup braces, `multiline-ternary: always`, sorted/one-per-line JSX props.
- **Services are mock stubs** today (`console.log` + in-memory arrays, `// TODO: Change to login response`); the real `CustomAxios` wrapper + interceptors exist in `services/index.service.ts` but most endpoints aren't wired to a backend yet.
- **Feature pattern** (CRUD master screen): `pages/<area>/<feature>/{index.tsx, Create.tsx, Update.tsx, Form.tsx}` + a table hook in `hooks/pages/...` + `services/<feature>/` + `types/api/<feature>/` + `constants/` + per-feature locale JSON registered in `locales/en/index.ts`. Composed from shared hooks (`useTablePagination`, `useTableState`, `useTableDelete`, `useCreate/Update/DeleteModal`, `useCreateForm`) and shared components (`CommonListCard`, `ConfirmModal`, `ValidDynamicFieldList`).

## Proposed CLAUDE.md content

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (proxies `/hris-api` to `VITE_APP_API_PROXY_URL`)
- `npm run start-dev` / `npm run start-prd` — dev server with `dev` / `prd` env mode
- `npm run build-dev` / `npm run build-prd` — type-check (`tsc -b`) then `vite build` for the given mode
- `npm run lint` — ESLint over `src`; `npm run lint:fix` — autofix `**/*.{ts,tsx}`
- No test runner is configured in this project.

Env files: `.env.dev`, `.env.prd`. Key vars: `VITE_APP_AXIOS_BASE_URL`, `VITE_APP_API_PROXY_URL`.

## Coding conventions (enforced by ESLint — violating these breaks `npm run lint`)

- **Imports**: relative parent imports (`../`) are forbidden. Always use path aliases: `@components`, `@constants`, `@contexts`, `@hooks`, `@locales`, `@pages`, `@routes`, `@services`, `@stores`, `@themes`, `@type` (→ `src/types`), `@utils`, plus `App`/`Main`.
- **Functions**: use named function declarations, not arrow-function declarations (`func-style: declaration`). Inline arrow callbacks are fine.
- **`console.*` is an error** — don't leave logging in committed code (existing mock services disable this rule per-file).
- Formatting: 4-space indent, single quotes, double quotes in JSX, required semicolons, no trailing newline at EOF (`eol-last: never`), Stroustrup brace style, `multiline-ternary: always`.
- JSX props are sorted (callbacks last) and one-per-line when multiline.

## Architecture

Single-page HRIS app. Entry: `src/Main.tsx` → `src/App.tsx` (MUI `ThemeProvider` + `RouterProvider`). Routing uses `createBrowserRouter`; route objects live in `src/routes/**` and aggregate up through `system.route.tsx` into `AppRouter.tsx`. `BasePage.tsx` is the layout shell (`<Outlet/>` plus global store-driven modals).

**Layered by concern, mirrored by feature.** A feature (e.g. `department`) is spread across parallel trees that share the same name:
- `pages/<area>/<feature>/` — UI: `index.tsx` (list screen), `Create.tsx`, `Update.tsx`, `Form.tsx`
- `hooks/pages/<area>/use-<feature>-table.tsx` — ag-grid column/menu config for that screen
- `services/<feature>/<feature>.service.ts` — data access functions
- `types/api/<feature>/<feature>.type.ts` — DTOs
- `constants/` and a `locales/en/<feature>.json` (registered in `locales/en/index.ts`)

**Shared building blocks** make each feature thin:
- Generic hooks in `hooks/common/`: `useTablePagination`, `useTableState`, `useTableDelete`, `useCreateModal`/`useUpdateModal`/`useDeleteModal`, `useCreateForm`, and `select-option/` hooks for dropdown data.
- Shared components in `components/`: `CommonListCard` (list+toolbar+pagination), `ConfirmModal`, and `ValidDynamicFieldList` — forms are declared as data (`rows` of typed field descriptors) rather than hand-built JSX. See `pages/system/organization/department/` for the canonical CRUD example.

**Data layer**: `services/index.service.ts` exports `CustomAxios` (a wrapper around an axios instance with request/response interceptors — injects `Accept-Language`, surfaces errors via `alert`). NOTE: most feature services are currently **mock stubs** returning in-memory data and `console.log`ing, not real HTTP calls — wire them through `CustomAxios` when connecting a backend.

**State**: Zustand stores in `stores/` (some `persist`ed to localStorage, e.g. `user.store.ts`, `locale.store.ts`). Global modals (`alert-modal`, `confirm-modal`) are store-driven and rendered once in `BasePage`. Form drafts persist via `form-draft.store.ts`.

**Forms**: react-hook-form `control` is created in the Create/Update wrapper (via `useCreateForm`), passed to the shared `Form` component, which feeds `ValidDynamicFieldList`.

**i18n**: react-i18next, initialized in `locales/index.ts`. All namespaces are flattened/merged into one translation object in `locales/en/index.ts` (and `ko`), so keys are accessed flat via `t('key')`. Add a new feature's strings as a JSON file and register it in the locale `index.ts`.

**Styling**: hybrid — MUI components themed via `utils/theme.util.ts` + `constants/theme/**` (palette, typography, component overrides), alongside Tailwind CSS v4 utility classes in `className`. Tables use ag-grid (quartz theme imported in `Main.tsx`).
````

## Verification
- `npm run lint` still passes (CLAUDE.md is not linted; this just confirms no incidental changes).
- Manually confirm the file renders and the alias list / commands match `vite.config.ts`, `tsconfig.json`, and `package.json`.
