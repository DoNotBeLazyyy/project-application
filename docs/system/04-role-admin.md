# 04 — Admin Role

**Responsibility boundary:** system and infrastructure. Users, roles, the academic calendar, global settings, grading *policy* (not grading itself), evaluation templates, academic thresholds, and the audit log. Admin has **no access to academic curriculum or student records** — those belong to Dean and Registrar respectively.

## Contents

- [1. Routes and navigation](#1-routes-and-navigation)
- [2. Dashboard](#2-dashboard)
- [3. User Management](#3-user-management)
- [4. School Year Management](#4-school-year-management)
- [5. Term Management](#5-term-management)
- [6. Term Type Management](#6-term-type-management)
- [7. Role Management ("Permissions")](#7-role-management-permissions)
- [8. Grading Configuration](#8-grading-configuration)
- [9. Evaluation Management](#9-evaluation-management)
- [10. Academic Thresholds](#10-academic-thresholds)
- [11. Audit Log](#11-audit-log)
- [12. System Settings](#12-system-settings)
- [13. Admin gaps summary](#13-admin-gaps-summary)

**Related chapters:** [11 — Grading Engine](11-grading-engine.md) · [02 — Auth & RBAC](02-auth-and-rbac.md) · [09 — Shared Features](09-shared-features.md)

---

## 1. Routes and navigation

All routes are children of `<AdminLayout />` at `admin`, under `<RoleGate allowedRoles={['Admin']} />`. Admin RPCs guard with `PERFORM public.fn_assert_role('Admin')`.

### Sidebar — three grouped sections

| Group | Label | Path |
|---|---|---|
| GENERAL | Dashboard | `/admin` |
| GENERAL | Users | `/admin/users` |
| ACADEMICS | Academic Years | `/admin/school-years` |
| ACADEMICS | Terms | `/admin/terms` |
| ACADEMICS | Term Types | `/admin/term-types` |
| CONFIGURATION | Grading | `/admin/grade-configurations` |
| CONFIGURATION | Evaluations | `/admin/evaluations` |
| CONFIGURATION | Permissions | `/admin/roles` |
| CONFIGURATION | Academic Thresholds | `/admin/academic-thresholds` |
| CONFIGURATION | Announcements | `/admin/announcement-management` |
| CONFIGURATION | Events | `/admin/event-management` |
| CONFIGURATION | Audit Log | `/admin/audit-logs` |
| CONFIGURATION | Settings | `/admin/system-settings` |

Footer: "My Profile" → `/admin/profile`. Admin has the **best-organised sidebar in the app** — the only one with meaningful grouping and distinct per-item icons.

> **Gaps** Academic Thresholds sits under CONFIGURATION though it is arguably academic. `/admin/profile` has no nav entry outside the footer.

---

## 2. Dashboard

**Route** `/admin` · **File** [AdminDashboard.tsx](../../src/pages/admin/AdminDashboard.tsx) · **RPC** `fn_get_admin_dashboard_stats` (no params) via the entire 6-line `admin.service.ts`.

Six read-only KPI cards plus the shared announcement and event feeds.

| Stat key | Clickable? |
|---|---|
| `total_students` | ✅ → `/admin/users` |
| `total_faculty` | ✅ → `/admin/users` |
| `active_terms` | ✅ → `/admin/terms` |
| `total_programs` | ❌ |
| `active_enrollments` | ❌ |
| `pending_clearances` | ❌ |

The three non-clickable cards are deliberate: their destinations are Dean- and Registrar-owned screens, and linking there would violate the §10 role boundary (QA fix U5 explicitly reasoned this through).

> **Gaps**
> - **`pending_clearances` is a stat for a feature that was cut from scope.** Clearances were removed from the roadmap; this card counts something the system no longer manages.
> - No term selector, unlike the Dean dashboard.
> - No error state — the component only checks `if (result.data)`, so a failed RPC leaves six `—` placeholders with no explanation.
> - This RPC **did not exist** until QA fix B3 created it; the frontend had been calling a missing function.

---

## 3. User Management

**Route** `/admin/users` · **Files** `src/pages/admin/user-management/` (index, `CreateUserForm`, `FilterUserForm`, `UserForm`, `useUserTableConfig`, `useUserOptions`)

The most operationally important admin screen. Users never self-register — Admin provisions everyone.

| Action | Implementation | RPC |
|---|---|---|
| List | `listUsers` | `fn_list_users_json` (`p_page`, `p_search`, `p_size`, `p_sort`, `p_role_code`, `p_status`, `p_city`, `p_province`) |
| Invite single | `inviteSingleUser` — auth invite, then | `fn_provision_single_user` |
| Bulk CSV import | `bulkProvisionUsers` — N auth invites, then one | `fn_bulk_provision_users` |
| Edit (name + roles) | `updateUser` | `fn_update_user` (`p_user_id`, `p_first_name`, `p_last_name`, `p_role_codes`) |
| Load into form | `getUserById` | `fn_get_user_by_id` |
| Delete / bulk delete | `deleteUsers(ids)` | `fn_bulk_delete_users` |
| Resend Invite | `resendInvite(email)` | *no RPC* — `supabaseAdmin.auth.resetPasswordForEmail` |
| Reset Password | `resetUserPassword(email)` | *no RPC* — identical implementation |

Columns: First Name, Last Name, Email, Roles, Status (Active→success, else warning). Checkbox column enabled, so bulk delete works properly here.

Filters: role, status (`All | Active | Invited`), city, province.

CSV template columns: `first_name, last_name, email, role_code`.

**Business rules:**
- Email is `disabled: true` on the edit form — **immutable after creation**.
- `role_codes` is a multi-select with a "Assign at least one role" validator, helper text *"A user may hold several roles and switch between them in the sidebar."* This is the multi-role assignment capability.
- Row menu: Resend Invite is disabled when `status === 'Active'`; Reset Password is disabled when `status !== 'Active'`. They are complementary.

> **Gaps**
> - **The create form offers "All Roles" as a creatable role code.** `CreateUserForm` uses `useRoleOptions({ withAllOption: true })`, so a literal `value: 'All'` appears in the role dropdown for a *create* action, where it is meaningless.
> - **Bulk import is N+1 with no throttling** — one `inviteUserByEmail` HTTP call per CSV row, sequentially, before the single bulk RPC. A 200-row import is 200 serial round-trips and will likely hit Supabase auth rate limits.
> - **Resend Invite fires and forgets** — no toast on success or failure. Reset Password does toast. Same underlying call, different feedback.
> - `resendInvite` and `resetUserPassword` are **byte-identical**; they differ only in which row action invokes them.
> - The invite flow is **not atomic** — see [02 §3](02-auth-and-rbac.md).
> - **`fn_bulk_delete_users` has no definition in `docs/sql/`.** It exists only on live.

---

## 4. School Year Management

**Route** `/admin/school-years`

| Action | RPC |
|---|---|
| List | `fn_list_school_years_json` (`p_page`, `p_search`, `p_size`, `p_sort`, `p_is_active`, `p_year`) |
| Get | `fn_get_school_year_by_id` |
| Create | `fn_create_school_year` (`p_code`, `p_label`, `p_start_date`, `p_end_date`, `p_is_active`) |
| Update | `fn_update_school_year` |
| Delete | `fn_delete_school_year` |
| Options (reused by Terms, Curriculum Map) | `fn_get_school_years` |

Columns: Code, Label, Start Date, End Date, Active badge. Filters: `is_active`, `year` (integer 1900–2100).

**Business rules:**
- Both dates are pickers with `disablePast: true`.
- `end_date` must be strictly greater than `start_date`.
- **Auto-fill on create only:** an effect sets `code = SY-<startYear>-<endYear>` and `label = School Year <startYear>-<endYear>` — but **only while the field is not dirty**, so a manual edit is never clobbered. Helper text warns the code *"Must be unique — edit it if this pair of years already exists."* This nuance was the fix for QA item R1.

> **Gaps**
> - 🔴 **Bulk delete is broken.** The screen has `hasCheckbox: true` but wires `onDelete={(ids) => deleteSchoolYear(ids[0])}` — **selecting N rows and confirming deletes only the first one**, while the grid deselects everything and reports success. Silent partial data loss.
> - R1 (create fails / doesn't display) is still marked **needs runtime repro** in the QA tracker. Every silent path was removed, but the symptom was never reproduced to confirm the fix.

---

## 5. Term Management

**Route** `/admin/terms` — CRUD plus the **term status state machine**.

| Action | RPC |
|---|---|
| List | `fn_list_terms_json` (`p_school_year_id`, `p_status`, + paging) |
| Get | `fn_get_term_by_id` |
| Create | `fn_create_term` — 8 params |
| Update | `fn_update_term` |
| **Advance status** | `fn_advance_term_status` (`p_term_id`) |
| Delete | `fn_delete_term` |

Create payload: `p_school_year_id`, `p_term_type_id`, `p_start_date`, `p_end_date`, `p_enrollment_start_date`, `p_enrollment_end_date`, `p_grading_deadline`, `p_evaluation_scope`.

### The state machine

```
Upcoming → Enrollment Open → Ongoing → Grading Period → Closed
```

Badge variants: Upcoming=info, Enrollment Open=warning, Ongoing=success, Grading Period=warning, Closed=error.

**Row-menu guards:**
- Edit is disabled when `status === 'Closed'`
- "Advance to {next}" appears only when a next status exists
- Delete is offered **only** for `Upcoming` and `Closed`

The advance confirmation branches its copy: from `Grading Period` it warns *"This will close the term permanently and cannot be undone."*; otherwise *"This will change the term status from X to Y."*

**Server guards** (`fn_advance_term_status`):
- `fn_assert_role('Admin')`
- Term not found → soft error
- Already `Closed` → *"Term is already closed and cannot be advanced"*
- **Advancing to `Ongoing` is blocked if another term in the same school year is already `Ongoing` or in `Grading Period`** — the one genuine cross-record invariant on this screen

### Form validation

All dates `disablePast`. Required: school year, term type, start, end. `end_date > start_date`. `enrollment_end_date > enrollment_start_date` (when both set). `grading_deadline > end_date` (when both set). Plus an `evaluation_scope` select — *Use institution default* / *Per Grading Period* / *Per Term*.

> **Gaps**
> - **No cross-validation that term or enrollment dates fall inside the parent school year.** A term can start before its school year does.
> - **No checkbox column** — no bulk delete for terms.
> - `enrollment_start_date` is never required, so a term can open enrollment with no start date.
> - The two cross-field validators read `control._getWatch(...)` — a **react-hook-form private API**. It will break on an RHF upgrade.
> - The view modal reuses `updateMethods` rather than a dedicated form instance — the exact pattern that caused the R1/R2 bugs elsewhere and was fixed on those two screens but not here.
> - `fn_create_term` was the subject of QA item B6: live had 7 params, the frontend sent 8, and two conflicting definitions existed in `docs/sql/`.

---

## 6. Term Type Management

**Route** `/admin/term-types` — the catalogue of term *kinds* (First Semester, Summer, …).

RPCs: `fn_list_term_types_json` · `fn_get_term_type_by_id` · `fn_get_term_types` (options, reused by Term form, System Settings, Curriculum Map) · `fn_create_term_type` · `fn_update_term_type` · `fn_delete_term_type`.

Fields: `code`*, `label`*, `sequence`* (min 1), `description`. Columns: Code, Label, Description, Sequence.

No checkbox, no filter modal, no CSV import.

> **Gaps** `TermTypeForm` accepts an `isCodeDisabled` prop that `index.tsx` **never passes** — so the code stays editable after creation, even though other records reference term types and `fn_seed_section_grading` matches on sequence. A dead affordance.

---

## 7. Role Management ("Permissions")

**Route** `/admin/roles`

RPCs: `fn_list_roles_json` · `fn_get_role_by_id` · `fn_get_roles` · `fn_create_role` · `fn_update_role` · `fn_delete_role`.

Columns: Code, Label, Description. No checkbox, no bulk delete, no filter, no CSV.

**Validation:** `code` must match `/^[A-Za-z][A-Za-z0-9_]*$/` with helper *"Letters, numbers and underscores, e.g. DEAN_SECRETARY"*. `label` must match `/^(?=.*[A-Za-z]).{2,}$/`.

> **Gaps — this one is conceptually important**
> - **The sidebar calls this "Permissions", but there is no permission or capability surface anywhere in the system.** This page manages the *roles catalogue* only. Authorization is hard-coded at design time via `fn_assert_role('<Role>')` string literals inside ~200 SQL function bodies.
>
>   This is a **deliberate, documented decision**, not an oversight: a configurable role↔RPC permission matrix would contradict the single-responsibility model, add a privilege-escalation surface, and cost a table plus a per-RPC lookup plus an admin UI. Admin decides *"this person is a Dean"*, not *"a Dean may call fn_X"*. **But the label promises otherwise, and a thesis panel will ask about it.**
> - Creating a new role through this screen produces a role code that **no `fn_assert_role` call anywhere recognises** — the new role can be assigned to users and grants literally nothing. The screen implies a capability it cannot deliver.
> - `isCodeDisabled` exists on `RoleForm` but is never passed, so role codes are editable after creation **even though other RPCs match on those code strings**. Renaming `Faculty` would silently break every guard referencing it.
> - `fn_delete_role` has no definition in `docs/sql/`.

---

## 8. Grading Configuration

**Route** `/admin/grade-configurations` — a three-tab card. Full engine semantics live in [11 — Grading Engine](11-grading-engine.md); this section covers the admin UI.

Tabs: `transmutation | periods | special`, default transmutation, each lazily loaded with an `isActive` cancellation flag.

### 8a. Transmutation tab

RPCs: `fn_get_transmutation_table` · `fn_save_transmutation_table` (`p_rows` = `[{transmuted_grade, min_percentage, description}]` — `max_percentage` is **derived**, not sent).

**A fixed 10-rung ladder.** Rows cannot be added or removed.

| Grade | Default floor | Description |
|---|---|---|
| 1.00 | 98 | Excellent |
| 1.25 | 95 | Superior |
| 1.50 | 92 | Very Good |
| 1.75 | 89 | Good |
| 2.00 | 86 | Meritorious |
| 2.25 | 83 | Very Satisfactory |
| 2.50 | 80 | Satisfactory |
| 2.75 | 77 | Fairly Satisfactory |
| 3.00 | 75 | Passing |
| 5.00 | **0 (fixed)** | Failed |

**Only `min_percentage` is editable**, and the 5.00 row's floor renders as a static `0`. `Max % (auto)` is derived: row 0 → 100, else previous row's floor − 1, rendering red when the derived max falls below the current floor.

Client-side `validateLadder` blocks save and focuses the offending field:
1. Grade 5.00 must have floor exactly 0
2. Every other floor: required, numeric, 0–100, and a **whole number**
3. Floors must be **strictly decreasing** as grade increases; the row above 5.00 must have floor > 0

If the server returns a row count other than exactly 10, the UI **discards them and falls back to the default ladder**.

### 8b. Periods tab

RPCs: `fn_get_grading_period_templates` · `fn_create_grading_period_template` · `fn_update_grading_period_template` · `fn_delete_grading_period_template`.

Fakes pagination — the RPC returns an unpaged array, and `buildPeriodListDto` wraps it in a synthetic `CommonListResDto` so `CommonTableCard` can render it.

Columns: Period Name, Weight (%), Components (`name (weight%) · …`). Nothing is sortable.

**Business rules:**
- The card subheader shows a live `Total weight: N%` with a ✓ at 100 or `(should equal 100%)` otherwise.
- **Create is blocked** when the period total already reaches 100: *"Grading periods already total 100%. You cannot add another period."*
- Create max weight = `100 − total`; edit max = `100 − (total − thisPeriod.weight)`. Enforced as an RHF rule and an input `max`.
- `sequence` is **auto-assigned** on create (`periods.length + 1`) and reused on update.
- The nested components sub-table requires each row's name and a weight of 1–100, shows a live total coloured green at exactly 100, and hides the add-row button once the total reaches 100.

> **Gaps**
> - 🔴 **The component 100% total is displayed as a hard requirement but is never enforced on submit.** A period whose components sum to 40% saves without complaint — and since `fn_calculate_final_grade` normalises by dividing by the *actual* total weight, this silently changes what a component is worth rather than failing.
> - **There is no reorder UI.** Sequence is auto-assigned at creation and cannot be changed, yet `fn_seed_section_grading` matches templates to periods **by sequence**. A mis-sequenced template propagates to every new section.

### 8c. Special Grades tab

RPCs: `fn_get_special_grade_configs` · `fn_save_special_grade_configs` · `fn_delete_special_grade_config`.

A plain card list (not a table). Per entry: Label, Code, Description, `Min Absence %`, `Completion Deadline (days)`, and checkboxes `Requires Completion`, `Is Passing`, `Active`. One Save persists the whole array. Blurb: *"Configure INC, FDA, DROP and other special grade rules."*

> **Gaps**
> - 🔴 **Removing a special grade deletes it server-side immediately**, before it is removed from local state, with **no confirmation prompt** — unlike every other delete in the application.
> - 🔴 **Nothing can ever apply a special grade to a student.** The catalogue is configurable here, `fn_list_grade_sheet` returns a `special_grade` column, and the student grade tab displays it — but **no role has a UI to set one**. The entire feature is write-only configuration with no consumer.
> - The text inputs are raw `CommonInput` with **no validation at all** — code and label can be blank, percentages unbounded.
> - `SpecialGradeItem` spins up its own `useForm` purely to feed a checkbox component, with `defaultValues` captured at mount while real state lives in the parent.

---

## 9. Evaluation Management

**Route** `/admin/evaluations` (list) and `/admin/evaluations/new` · `/admin/evaluations/:id` (detail)

Manages the ordered **sections** of the faculty evaluation students must complete before they can view released grades. This is the gate on grade release — see [11](11-grading-engine.md).

### List

RPCs: `fn_list_evaluation_templates_json` · `fn_delete_evaluation_template` · `fn_bulk_create_evaluation_templates` · `fn_get_programs` (for program labels).

Columns: Order (`sequence`), Section (`title`), Programs (resolved from `program_ids`; **empty means "All programs"**), Questions (`question_count`), Status badge.

No filter modal, no checkbox, no bulk delete. Create → `/admin/evaluations/new`; row click → detail.

CSV template is flat, one question per row: `section_title, section_sequence, section_description, is_active, program_codes` (pipe-delimited, blank = all), `question_text, question_type, is_required, min_rating, max_rating`.

### Detail

Uses the `EntityFormPage` shell. RPCs: `fn_get_evaluation_template_by_id` · `fn_create_evaluation_template` · `fn_update_evaluation_template`.

Header fields: `title`* (helper *"Shown as the section heading on the student form."*), `sequence`* (helper *"Lower numbers appear first on the student form."*), `program_ids` multi-select (placeholder *"All programs"*, helper *"Leave empty to show this section to every program."*), `is_active`, `description`.

Questions sub-table: Question (required, with a **case-insensitive trimmed uniqueness validator** across the whole array), Type (`Rating | Multiple Choice | Open Ended`), Min (1–10), Max (1–10), Required. New questions default to Rating/required/1–5. Paginated client-side at 10 per page, with add-then-jump-to-new-question behaviour.

Service mapping: empty `program_ids` → `null` (all programs); min/max are numbers **only for `Rating`**, else null. **Question `id` is not sent — updates are replace-all.**

> **Gaps**
> - 🔴 **`Multiple Choice` has no choice/option editor at all.** The type is selectable, saves fine, and its options can never be authored. A student answering it has nothing to choose from.
> - Min/Max rating inputs are shown for **every** question type, even though the service nulls them for non-Rating types.
> - **No validation that `min_rating < max_rating`.**
> - Because updates are replace-all with no question `id`, **editing a template destroys and recreates every question** — any responses keyed to the old question rows are orphaned.
> - The toolbar's "Download CSV" and "Upload CSV" buttons **open the same modal** (the template download lives inside it). Same pattern on Programs, Courses, Sections, and Curriculum Map.

---

## 10. Academic Thresholds

**Route** `/admin/academic-thresholds` · Single file, no sub-components.

RPCs: `fn_get_academic_thresholds` · `fn_update_academic_thresholds` (`p_thresholds` = `[{id, min_gwa, max_gwa, requires_no_failing, scholarship_discount_pct, is_active}]`).

**Update-only** — rows come from the server; there is no create or delete. Grouped by category:

| Category | Description shown |
|---|---|
| Honor | "Latin honor cutoffs. A student qualifies for the highest honor whose GWA ceiling they meet." |
| Scholarship | "Academic scholarship cutoffs and the tuition discount awarded at each tier." |
| Standing | "The passing GWA ceiling used to derive Good Standing versus Probation." |

Per row: label header, `is_active`, `Minimum GWA` (helper explicitly says **"display only"** — it carries no rules), `Maximum GWA` (required, 1.00–5.00), `Discount %` (**Scholarship only**, 0–100), and `Requires no failing grade` (**hidden for Standing**).

This screen is architecturally significant: it is Phase 0.2 of the roadmap, the "academic-computation core" that removed hard-coded honor cutoffs from `fn_get_academic_standing` so that one configurable source feeds grade computation, analytics, and the AI advisor alike. **The AI's honors projections read from here.**

> **Gaps** `groupedIndexes` is memoised on `[metaById, isLoading]` while reading `getValues('thresholds')` — brittle if the row count ever changes. The `Minimum GWA` field being editable but explicitly non-functional ("display only") is confusing.

---

## 11. Audit Log

**Route** `/admin/audit-logs` · Fully read-only.

RPCs: `fn_list_grade_audit_logs_json` (`p_action`, `p_table_name`, `p_date_from`, `p_date_to`, + paging) · `fn_get_audit_log_tables` (populates the Table filter).

Columns: Date (`en-PH` locale), Action badge (Insert=success / Update=warning / Delete=error), Table, Field, Old Value, New Value, Student, Section, Changed By, Reason.

Filters: Action, Table, From date, To date.

> **Gaps**
> - **No export.** For a compliance-oriented feature this is the most obvious omission — an audit log you cannot extract is of limited use, and it is the screen a thesis panel would most want to see evidence from.
> - No client validation that From ≤ To.
> - No row click or detail view — long values are only visible via tooltip.
> - As noted in [02 §12](02-auth-and-rbac.md), the IP column is populated by `inet_client_addr()`, which behind Supabase's pooler records **the pooler's address, not the user's**.

---

## 12. System Settings

**Route** `/admin/system-settings`

RPCs: `fn_get_system_settings` · `fn_update_system_settings` · `fn_get_term_types` (options).

Fields (2-column grid): `institution_name`*, `institution_short_name`*, `institution_address`*, `institution_email`* (regex-validated), `institution_phone`*, `institution_website` (optional, regex), `academic_year_start_month`* (Jan–Dec, default June), `max_units_per_term`*, `default_term_type_id`, `default_evaluation_scope`* (Per Grading Period / Per Term, default Period).

**Logo upload:** a hidden file input accepting `image/jpeg,image/png,image/webp,image/svg+xml`, uploading via `uploadFile({ bucket: 'logos', path: 'logos/institution-logo.<ext>', upsert: true })` with a live preview and an "Uploading…" state.

> **Gaps**
> - **`max_units_per_term` rule allows up to 60 but the widget's `max` attribute is 24** — the browser caps input at 24 while the error message says 60.
> - The logo uses a **fixed filename with `upsert: true`**, so every upload overwrites the previous one globally. There is **no size or dimension validation**, and the URL is only persisted when the form is subsequently saved — uploading and then navigating away leaves an orphaned file and an unchanged setting.
> - Two different SQL files (`evaluation-scope.sql` and `security-retrofit.sql`) both define `fn_get_system_settings` / `fn_update_system_settings`. Which one is live is unverifiable without querying the database.

---

## 13. Admin gaps summary

| # | Gap | Impact |
|---|---|---|
| 1 | **School year bulk delete only deletes the first selected row** while reporting success | 🔴 Silent data loss |
| 2 | **Special grades can be configured but never applied to a student** | 🔴 A whole feature with no consumer |
| 3 | **Special grade removal deletes server-side with no confirmation** | 🔴 Irreversible, unprompted |
| 4 | **Evaluation `Multiple Choice` has no options editor** | 🔴 Broken question type |
| 5 | **Evaluation update is replace-all, orphaning prior responses** | 🔴 Data integrity |
| 6 | **Grading period component 100% total displayed as required, never enforced** | 🔴 Silently changes grade weighting |
| 7 | **"Permissions" screen manages no permissions**; new roles grant nothing | 🟠 Misleading; a panel question |
| 8 | **Bulk user import is N+1 serial auth calls** | 🟠 Will rate-limit on real data |
| 9 | **No cross-validation of term dates against the parent school year** | 🟠 Invalid calendars possible |
| 10 | **Audit log has no export** | 🟠 Undercuts the compliance story |
| 11 | Grading period templates cannot be reordered, yet seeding matches by sequence | 🟠 Mis-sequencing propagates |
| 12 | `isCodeDisabled` never passed on Role and Term Type — codes editable post-creation | 🟠 Renaming a role code breaks guards |
| 13 | Admin dashboard counts `pending_clearances` for a cut feature | 🟡 Dead stat |
| 14 | `max_units_per_term` rule (60) vs widget (24) mismatch | 🟡 Confusing |
| 15 | "All Roles" offered as a creatable role code | 🟡 Nonsensical option |
| 16 | Resend Invite gives no feedback; Reset Password does | 🟡 Inconsistent |
| 17 | `TermForm` uses the RHF private API `control._getWatch` | 🟡 Upgrade hazard |
| 18 | Logo upload: fixed filename, no validation, orphan on navigate-away | 🟡 |
| 19 | `fn_bulk_delete_users` and `fn_delete_role` have no `docs/sql/` definition | 🟡 Unverifiable |
