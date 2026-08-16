# 01 — Architecture

How the application is put together: the "thick database, thin client" paradigm, the single transport layer every feature goes through, the routing tree, global state, the shared component layer, and the build toolchain.

## Contents

- [1. The core paradigm](#1-the-core-paradigm)
- [2. The service layer contract](#2-the-service-layer-contract)
- [3. The four wrappers](#3-the-four-wrappers)
- [4. Error, toast, and loading behaviour](#4-error-toast-and-loading-behaviour)
- [5. Routing tree](#5-routing-tree)
- [6. Global state (Zustand stores)](#6-global-state-zustand-stores)
- [7. The list-screen pattern: CommonTableCard](#7-the-list-screen-pattern-commontablecard)
- [8. The record-page pattern: EntityFormPage](#8-the-record-page-pattern-entityformpage)
- [9. Component library inventory](#9-component-library-inventory)
- [10. Forms](#10-forms)
- [11. Styling system](#11-styling-system)
- [12. Build, environment, and tooling](#12-build-environment-and-tooling)
- [13. Architectural gaps](#13-architectural-gaps)

**Related chapters:** [02 — Auth & RBAC](02-auth-and-rbac.md) · [03 — Data Model](03-data-model.md) · [09 — Shared Features](09-shared-features.md)

---

## 1. The core paradigm

The frontend is a **presentation layer only**. Every piece of business logic — filtering, aggregation, grade computation, status derivation, multi-table transactions — lives in PostgreSQL functions and is invoked over `supabase.rpc()`.

This is not aspirational. It is the actual shape of the codebase:

| Claim | Reality in the code |
|---|---|
| No business logic in the client | Holds, with narrow exceptions (see below) |
| No `supabase.from()` chains outside `@services` | Holds — there are none anywhere |
| Every Supabase call routed through a wrapper | Holds for data; **file uploads bypass it** |
| Every service returns `ServiceResult<T>` | Holds across all 42 service modules |

**Documented exceptions where computation does happen client-side:**

| Location | Computation | Why it matters |
|---|---|---|
| `StudentAttendanceTab.tsx` | Attendance rate = `round(((present + late) / recorded) * 100)` | "Late counts as attended" is a business rule living in a React component |
| `QuestionList.tsx` | Sums question points for the header | Never reconciled against the `total_points` setting field |
| `RubricGradingPanel.tsx` | Live rubric score total | Display only; the server recomputes on save |
| `RubricBuilderPage.tsx` | Live `totalPoints` from `useFieldArray` | Display only |
| `GradingComponentPanel.tsx` | `totalWeight` sum driving the disabled Add button | Server independently enforces the same cap |
| `SectionInsightPanel.tsx` | Bar-chart heights normalised to the max bucket | Pure presentation |

The first one is the only genuine violation — an institutional rule about what counts as attendance is encoded in TSX rather than SQL.

---

## 2. The service layer contract

Every function in `src/services/*.ts` returns:

```ts
ServiceResult<T> = { data: T | null; error: ServiceErrorProps | null }
```

Services **never throw**, never return a raw Supabase response, and never expose Axios types. There are **42 service modules**:

| Domain | Modules |
|---|---|
| Transport | `supabase.client.ts`, `supabase.admin.ts`, `supabase.wrapper.ts` |
| Auth & identity | `auth.service.ts`, `profile.service.ts`, `user.service.ts`, `role.service.ts` |
| Admin/system | `admin.service.ts`, `system-settings.service.ts`, `audit-log.service.ts`, `school-year.service.ts`, `term/term.service.ts`, `term/term-type.service.ts`, `academic-threshold.service.ts`, `grading-config.service.ts` |
| Academic architecture | `department.service.ts`, `program/program.service.ts`, `program/program-level.service.ts`, `course/course.service.ts`, `course/course-type.service.ts`, `curriculum-map.service.ts`, `section.service.ts`, `faculty-load.service.ts` |
| Records | `student.service.ts`, `enrollment.service.ts`, `records.service.ts`, `progression.service.ts`, `grade-release.service.ts` |
| Instruction | `faculty.service.ts`, `assessment.service.ts`, `rubric.service.ts`, `content.service.ts`, `discussion.service.ts` |
| Student-facing | `student-portal.service.ts` |
| Cross-cutting | `announcement.service.ts`, `event.service.ts`, `notification.service.ts`, `dashboard.service.ts`, `analytics.service.ts`, `evaluation.service.ts`, `assistant.service.ts`, `storage.service.ts` |

---

## 3. The four wrappers

All in [supabase.wrapper.ts](../../src/services/supabase.wrapper.ts).

| Wrapper | Use | Loading overlay | Toasts |
|---|---|---|---|
| `callRpc<T>(fn, params, opts?)` | `supabase.rpc()` — the workhorse; **essentially every call in the app** | Yes, unless `{ silent: true }` | Yes, on soft envelopes |
| `callQuery<T>(cb)` | `.from().select()` returning `T[]` | Yes | Yes on error |
| `callSingle<T>(cb)` | `.from().select().single()` | Yes | Yes on error |
| `callFunction<T>(name, body)` | Supabase Edge Function | **No** — deliberate | Yes on error |

> **Gaps**
> - `callQuery` and `callSingle` have **zero call sites** in the entire codebase. They exist as contract, unused. Everything goes through `callRpc`.
> - `callFunction` skips the global loader on purpose: the AI assistant has its own inline "Thinking…" state, and the global spinner disables every `CommonButton` on screen — including the assistant's own send button. This deviation is documented in the Edge Function README.

---

## 4. Error, toast, and loading behaviour

### The soft-envelope convention

`callRpc` inspects the returned JSONB payload:

| Payload shape | Behaviour |
|---|---|
| `{ success: false, message }` | Error toast; converted to `{ data: null, error: { message } }` |
| `{ success: true, message }` | Success toast; data passes through |
| **Anything else** | Passes through with **no toast at all** |

That third row is the root of the **SF7 silent-write class**: any write RPC that returns a bare row, a void, or a payload without a `message` key completes with zero user feedback. A confirmed instance is `fn_calculate_all_grades_for_period`, which returns `{success, processed, succeeded, failed, failures}` — no `message` — so the faculty "Calculate Grades" button gives no confirmation, and its per-student `failures[]` array is discarded by the UI entirely.

### The 401/403 rule

This is the single most consequential piece of logic in the wrapper, added as QA fix S1:

```
isPostgresRpcError(error)   = error.code matches /^[0-9A-Z]{5}$/
shouldRedirectToLogin(s, e) = (s === 401 || s === 403) && !isPostgresRpcError(e)
handleAuthFailure()         = clearSession() + window.location.href = '/login'
```

**Why it exists:** the Phase 7 security retrofit made ~47 RPCs `RAISE ... USING ERRCODE = '42501'`. PostgREST surfaces that as HTTP 403. The old code treated *any* 403 as an expired session — so a normal "you're not allowed to do that" **silently logged the user out**. Now a 403 carrying a 5-character SQLSTATE is a business error (toast, session preserved); only a 403 *without* one is an auth failure.

### Loading

`useLoadingStore` is ref-counted: `show()` increments, `hide()` decrements (floored at 0) and schedules `isLoading = false` after a **100 ms debounce**, so back-to-back requests don't flicker the overlay. Components must never call `show`/`hide` themselves — with two exceptions that do, both in `user.service.ts` (`inviteSingleUser`, `bulkProvisionUsers`), because their auth half bypasses `callRpc`.

---

## 5. Routing tree

From [AppRouter.tsx](../../src/routes/AppRouter.tsx), built with `createBrowserRouter`:

```
/ (BasePage, errorElement ErrorPage)
├─ login | forgot-password | set-password          ← PUBLIC
└─ AuthGuard
   ├─ unauthorized
   └─ ProtectedLayout (errorElement ErrorPage)
      ├─ index → RoleRedirect
      ├─ RoleGate['Admin']     → adminRoutes
      ├─ RoleGate['Dean']      → deanRoutes
      ├─ RoleGate['Registrar'] → registrarRoutes
      ├─ RoleGate['Faculty']   → facultyRoutes
      ├─ RoleGate['Student']   → studentRoutes
      └─ * → ErrorPage isNotFound
```

`ProtectedLayout` additionally mounts the global `<AiAssistant />` FAB and `<SessionTimeoutModal />`.

Role route files: [admin.route.tsx](../../src/routes/admin/admin.route.tsx) · [dean.route.tsx](../../src/routes/dean/dean.route.tsx) · [registrar.route.tsx](../../src/routes/registrar/registrar.route.tsx) · [faculty.route.tsx](../../src/routes/faculty/faculty.route.tsx) · [student.route.tsx](../../src/routes/student/student.route.tsx)

> **Gaps**
> - **`RoleGate` is a rendering guard, not an authorisation boundary.** All five role subtrees ship in the same bundle. Real enforcement is entirely at the RPC layer — see [02 — Auth & RBAC](02-auth-and-rbac.md).
> - **Three separate role→path derivations coexist** despite QA Phase 4 consolidating on `role.constant.ts`: `ROLE_HOME` (the intended one), a private `ROLE_PATHS` duplicate inside `LoginPage`, and `activeRole.toLowerCase()` string-building inside `UnauthorizedPage`.

---

## 6. Global state (Zustand stores)

Only **three** stores exist. There is no data-fetching library — no React Query, no SWR. Every page refetches imperatively in `useEffect`.

### `app.store.ts`

| State | Persisted? |
|---|---|
| `session: Session \| null` | ✅ yes |
| `activeRole: UserRole \| null` | ✅ yes |
| `userProfile: UserProfile \| null` | ❌ rehydrated from `fn_get_auth_context` |
| `availableRoles: RoleItem[]` | ❌ rehydrated |

Persist key `au-jas-app` in `localStorage`, `partialize` limited to the first two.

Actions: `setSession`, `setActiveRole`, `setUserProfile`, `setAvailableRoles`, `resolveActiveRole`, `clearSession`.

`resolveActiveRole()`: no roles → `null`; current `activeRole` still held → keep it (this is what makes a role survive refresh); otherwise fall back to `availableRoles[0].code`.

### `loading.store.ts`
`isLoading`, `loadingCount`, `show()`, `hide()`, `setIsLoading`. Ref-counted with the 100 ms hide debounce described above.

### `toast.store.ts`
`toasts: ToastItem[]` with variants `success | error | warning | info` (default `error`). Keeps only the **last 3**, auto-removes after **4000 ms**. The whole `showToast` body is wrapped in `try {} catch { return; }`. Rendered by `CommonToast`, mounted in `App.tsx`.

---

## 7. The list-screen pattern: CommonTableCard

[CommonTableCard.tsx](../../src/components/table-card/CommonTableCard.tsx) is the deliberate "god component" behind nearly every management screen. A page that mounts it gets, for free:

- Server-paged fetch via one `onFetch(page, size, search, sort)` callback
- Search box (Enter to submit)
- Sort modal driven by a `sortColumns` array, plus AG-Grid column-header sorting
- Filter modal via `filterModalProps` + `onFilter`
- Create / update / view modals, whose open state the card owns internally
- Per-row action menu via `tableActionConfig`, and a row-click handler
- `DeletePromptModal` confirmation for single (`onDeleteRow`) and bulk (`onDelete`) delete
- `ConfirmPromptModal` "discard changes?" when closing a dirty update modal
- Pagination controls and layout

The architectural rule this enforces: **parent pages must not manage modal state or render loose action modals.** They pass form content in as props (`createModalContent`, etc.) and inject controls via a single `controls: Partial<TableCardControlsProps>` object rather than loose `onClick` props.

---

## 8. The record-page pattern: EntityFormPage

[EntityFormPage.tsx](../../src/components/entity-form/EntityFormPage.tsx) implements the codified navigation convention:

> **Records get URLs; transient actions get modals.**

- **Full-page routes** for viewing, creating, editing a record: `/entity/:id` and `/entity/new`. Deep-linkable, bookmarkable, working back button.
- **Modals only** for genuinely transient interactions: confirmations, filter, sort, bulk import.

`exitEditing()` navigates away when `!isEditing` (QA fix U6 — previously Back silently re-set `isEditing` to false and appeared to do nothing in view mode).

> **Gaps**
> This convention is **partially adopted**. Announcements and events use `EntityFormPage`; the assessment builder, rubric builder, section detail, and student records are hand-rolled pages. The remaining management screens (users, courses, programs, departments, sections, school years, terms, students, enrollments…) still use the modal-detail pattern the convention was meant to replace. Roughly 13 screens were identified for migration; the migration did not happen.

---

## 9. Component library inventory

Raw MUI primitives are forbidden where a wrapper exists.

| Folder | Components |
|---|---|
| `badge` | `CommonBadgeState`, `CommonBadgeStatus`, `CommonChip` |
| `button` | `CommonButton`, `FormButtons` (cancel/confirm/optional reset) |
| `calendar` | `Calendar` + 9 parts (`CalendarCell`, `CalendarContent`, `CalendarPicker`, …) — contains two `TODO: change` markers |
| `card` | `CommonCard`, `StatCard` (optional `to` renders it as a navigating button — U5) |
| `checkbox` | `ValidCommonCheckbox` |
| `dashboard` | `AnnouncementsFeedCard`, `DashboardHeader`, `EventsFeedCard`, `InstitutionalIdentityCard`, `StudentInsightSummaryCard` |
| `datepicker` | `ValidCommonDatepicker`, `ValidCommonDateTimepicker` |
| `entity-form` | `EntityFormPage` |
| `form` | `CommonForm`, `CommonCardForm`, `FormField` (the field-type switch) |
| `icons` | 11 hand-rolled SVGs |
| `input` | `CommonInput` (owns `hasPasswordToggle`), `CommonNumberInput`, `ValidCommonInput`, `ValidCommonNumberInput` |
| `layout` | `ProtectedLayout` |
| `modal` | `CommonModal`, `CommonFormModal`, `CommonActionModal`, `CommonPromptModal`, `AlertPromptModal`, `ConfirmPromptModal`, `DeletePromptModal`, `TypedDeleteModal`, `TableModals`, `BulkImportModal`, `SessionTimeoutModal`, `sort-modal/*` |
| `navbar` | `CommonNavbar` |
| `notification` | `NotificationBell` |
| `pagination` | `CommonPagination` + 5 parts |
| `progress-bar` | `CommonProgressBar` + 3 parts |
| `select` | `CommonSelect`, `CommonMultiSelect`, `ValidCommonSelect`, `ValidCommonMultiSelect` |
| `sidebar` | `CommonSideBar`, `CommonSideBarList`, `CommonHeaderSideBar`, `SideBarAccordionGroup`, `SideBarSectionGroup`, `SideBarSimpleItem`, … |
| `tab-menu` | `CommonTabMenu`, `TabMenuIcon`, `TabMenuLabel` |
| `table` | `CommonTable` (AG Grid wrapper), `CommonFormTable`, `TableActionCell`, `useTableConfigs.tsx`, `useTableLogic.tsx` |
| `table-card` | `CommonTableCard`, `CommonFormTableCard`, `TableCardActionMenu`, `TableCardControls`, `TableCardInput`, `hooks/useTableData.ts`, `hooks/useTableSelection.ts` |
| `textarea` | `CommonTextarea`, `ValidCommonTextArea` |
| `toast` | `CommonToast` |

Contexts: `TableCardContext.ts`. Hooks: `useDashboardFeeds`, `useFormPagination`, `useIdleTimeout`.

**Sidebar navigation is not centralised.** `src/constants/sidebar.constant.ts` holds only `VARIANT_STYLES` (dark/light Tailwind class maps). The actual nav items are inline `useMemo` `SideBarSection[]` arrays inside each of the five `*Layout.tsx` files.

---

## 10. Forms

`react-hook-form` throughout. The standard is `ValidCommonInput` and its siblings, which call `useController` internally — **never** manual `<Controller>` wrapping and never `register` with custom components.

`formErrors` in `src/utils/form.util.ts` is the `onError` handler for `handleSubmit`. It calls `methods.setFocus` on the first invalid field and dispatches a `FORM_ERROR_EVENT` DOM event that `CommonToast` turns into a warning toast.

> **Gaps**
> `CLAUDE.md` §4 still documents `formErrors` as handling `window.alert`; it does not, and hasn't since the alert was removed. More importantly `setFocus` is a **no-op on an unmounted or hidden field**, so validation errors on an inactive tab or wizard step focus nothing and scroll nowhere. This is open item **SF4** (blocked on a decision) and **SF5** (not started).

---

## 11. Styling system

A strict split:

| Concern | Tool |
|---|---|
| Interactive controls | MUI v7 only |
| Layout, spacing, typography, text | Plain HTML + Tailwind CSS v4 |
| Colour | MUI CSS variables consumed through Tailwind arbitrary syntax, e.g. `text-(--mui-palette-text-primary)` |
| Icons | `@phosphor-icons/react` |

`<Typography>`, `<Box>`, `<Stack>`, and `<Grid>` are forbidden; headings and text use `<h1>`–`<h6>`, `<p>`, `<span>`, `<div>`.

Theme lives in `src/constants/theme/` — `palette`, `tokens`, `typography`, `shape`, `spacing`, `components` constants plus 14 `override/*` files, assembled by `src/utils/theme.util.ts` and passed to `<ThemeProvider>` in `App.tsx`.

---

## 12. Build, environment, and tooling

### Scripts

| Task | Command |
|---|---|
| Dev server | `npm run dev` (or `start-dev` / `start-prd` for explicit modes) |
| **Typecheck + build (dev)** | `npm run build-dev` — runs `tsc -b` first |
| Typecheck + build (prod) | `npm run build-prd` |
| Lint | `npm run lint` |
| Lint + autofix | `npm run lint:fix` |
| Preview bundle | `npm run preview` |

**There is no test script and no test runner.** No Jest, no Vitest, no `*.test.ts` files anywhere. `npm run build-dev` *is* the typecheck, and it plus targeted `eslint` is the entire automated verification story.

### Environment

Vite loads env by `--mode`; `.env.dev` and `.env.prd` are the only mode files (no `.env`, no `.env.example`). The whole codebase reads exactly four variables:

| Variable | Read by |
|---|---|
| `VITE_SUPABASE_URL` | both client files |
| `VITE_SUPABASE_ANON_KEY` | `supabase.client.ts` |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `supabase.admin.ts` — **see the critical finding in [02](02-auth-and-rbac.md)** |
| `VITE_APP_API_PROXY_URL` | `vite.config.ts` only, at build time |

### Path aliases

Fifteen aliases, zero relative imports permitted (`../`, `./`, `..` are all banned by two overlapping ESLint rules).

`@assets` `@components` `@constants` `@contexts` `@hooks` `@locales`† `@pages` `@routes` `@services` `@stores` `@themes`† `@type` (→ `src/types`, note the singular) `@utils` `App` `Main`

† **These two point at directories that do not exist.** Theme code actually lives in `src/constants/theme/`, and there is no `src/locales` at all.

### Lint

ESLint flat config: `@eslint/js` recommended + `eslint-plugin-react` + `typescript-eslint` **strict** and **stylistic**, with type-aware `parserOptions.project: true`.

Rules that visibly shape the codebase: 4-space indent · single quotes (double in JSX) · semicolons always · `comma-dangle: never` · `eol-last: never` (no trailing newline) · `brace-style: stroustrup` · **`func-style: declaration`** with `allowArrowFunctions: false` (this is why every component is `export default function X()`) · `multiline-ternary: always` · `operator-linebreak: before` · `newline-per-chained-call` · **`no-console: error`** · `import/no-relative-parent-imports` plus `no-restricted-imports` patterns.

**Prettier is not installed.** No `.prettierrc`, no dependency, no format script — formatting is enforced entirely through those ESLint stylistic rules, despite `CLAUDE.md` §0 referencing a `.prettierrc.json`.

### Dependency notes

React 18 runtime with **`@types/react@^19`** — a major-version mismatch between runtime and types.

Declared but unused or suspect: `react-i18next` (no locales directory, zero `useTranslation` call sites) · `axios` (all HTTP goes through supabase-js) · `dotenv` as a runtime dependency in a Vite app · `react-icons` alongside `@phosphor-icons/react` **and** `@mui/icons-material` — three icon libraries · `@tailwindcss/vite` installed but not registered in `vite.config.ts` (Tailwind runs through `postcss.config.js` instead) · a `/lms-api` dev proxy with no caller in `src/`.

---

## 13. Architectural gaps

Consolidated; each is expanded in the chapter that owns it.

| # | Gap | Severity | Detail in |
|---|---|---|---|
| 1 | Service-role key inlined into the client bundle | **Critical** | [02](02-auth-and-rbac.md) |
| 2 | No migration runner; live DB drifts from `docs/sql` | **High** | [03](03-data-model.md) |
| 3 | No automated tests of any kind | **High** | [14](14-assessment-pros-cons.md) |
| 4 | Two coexisting denial conventions (`RAISE 42501` vs soft envelope) | Medium | [02](02-auth-and-rbac.md) |
| 5 | Silent-write class: RPCs with no `message` key confirm nothing | Medium | this chapter, §4 |
| 6 | `EntityFormPage` convention only partially adopted (~13 screens unmigrated) | Medium | this chapter, §8 |
| 7 | No `onAuthStateChange` subscription — cross-tab sign-out doesn't propagate | Medium | [02](02-auth-and-rbac.md) |
| 8 | Three duplicate role→path derivations | Low | this chapter, §5 |
| 9 | Dead aliases (`@locales`, `@themes`), unused deps, dead dev proxy | Low | this chapter, §12 |
| 10 | `@types/react@19` against `react@18` | Low | this chapter, §12 |
