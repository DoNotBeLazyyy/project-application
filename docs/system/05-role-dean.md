# 05 — Dean Role

**Responsibility boundary:** academic architecture. The Dean designs what is taught and who teaches it — departments, programs, courses, prerequisites, curriculum maps, sections, and faculty assignment. The Dean does **not** manage users, enrollments, or grades.

Dean-scoped RPCs guard with `fn_assert_role('Dean', 'Admin')`.

## Contents

- [1. Routes and navigation](#1-routes-and-navigation)
- [2. Dashboard](#2-dashboard)
- [3. Department Management](#3-department-management)
- [4. Program Level Management](#4-program-level-management)
- [5. Program Management](#5-program-management)
- [6. Course Type Management](#6-course-type-management)
- [7. Course Management](#7-course-management)
- [8. Curriculum Map Management](#8-curriculum-map-management)
- [9. Section Management](#9-section-management)
- [10. Faculty Load & Schedule Conflicts](#10-faculty-load--schedule-conflicts)
- [11. Dean gaps summary](#11-dean-gaps-summary)

**Related chapters:** [11 — Grading Engine](11-grading-engine.md) · [06 — Registrar](06-role-registrar.md) · [03 — Data Model](03-data-model.md)

---

## 1. Routes and navigation

### Sidebar — a single flat `OVERVIEW` section with 11 items

| Label | Path |
|---|---|
| Dashboard | `/dean` |
| Program Level | `/dean/program-level-management` |
| Course Type | `/dean/course-type-management` |
| Department | `/dean/department-management` |
| Program | `/dean/program-management` |
| Course | `/dean/course-management` |
| Curriculum Map | `/dean/curriculum-map-management` |
| Section | `/dean/section-management` |
| Faculty Load | `/dean/faculty-load` |
| Announcements | `/dean/announcement-management` |
| Events | `/dean/event-management` |

> **Gaps**
> - **8 of 11 items use the identical `SquaresFourIcon`** — there is essentially no visual differentiation in the Dean's navigation, and the list is flat despite having a natural grouping (catalogues → structures → offerings → oversight). Compare the Admin sidebar, which is properly grouped and icon-differentiated.
> - **Department uses an `exact` path match**, so `/dean/department-management/:id` and `/new` **de-highlight the nav item** while you're on them. Faculty Load correctly uses `startsWith`.

### A note on the entity dependency chain

The Dean's screens must be used in a strict order, and nothing in the UI communicates this:

```
Department ─┐
            ├→ Program ─┐
Program Level ─────────┘  ├→ Curriculum Map
                          │
Course Type ─→ Course ────┘
                     └────→ Section ─→ (Faculty assignment)
                                   └──→ Registrar can enroll
```

---

## 2. Dashboard

**Route** `/dean` · **RPC** `fn_get_dean_dashboard` with `p_term_id: null` **hard-coded** — the server picks the current term. `DashboardHeader` displays which term is in play, but there is no picker to change it.

**Nine stat cards**, each with a drill-down:

| Stat | Links to |
|---|---|
| `total_departments` | `/dean/department-management` |
| `total_programs` | `/dean/program-management` |
| `total_courses` | `/dean/course-management` |
| `sections_this_term` | `/dean/section-management` |
| `enrolled_students` | `/dean/section-management` |
| `total_faculty` | `/dean/faculty-load` |
| `unassigned_sections` | `/dean/section-management` |
| `schedule_conflicts` | `/dean/faculty-load` |
| `at_risk_students` | `/dean/section-management` |

**Panel "Needs a Faculty Assignment"** — lists `unassigned_sections` with course code, section code, title, and enrolled count. Each is a button navigating to `/dean/section-management`. Empty state: *"Every section in this term has a faculty assigned."*

**Panel "Insight Highlights"** — `at_risk_sections` showing course/section code, faculty name (or "Unassigned"), average score, and `N/M at risk` in error colour. Rendered as **non-clickable** divs. Empty state: *"No at-risk students detected this term."*

Plus the shared announcement and event feed cards.

> **Gaps**
> - **The "Needs a Faculty Assignment" panel does not deep-link.** It knows the `section_id` and navigates to the bare list anyway, so the Dean must re-find the row manually. This is the single highest-value fix on the Dean side — it is the dashboard's primary call to action and it dead-ends.
> - Insight Highlights is not clickable at all, mirroring the same flaw on the Faculty dashboard.
> - No term selector despite the header advertising the term.

---

## 3. Department Management

**Route** `/dean/department-management` (list) · `/new` · `/:id` (detail)

**This is the only Dean entity using the detail-page pattern** — every other one uses modals.

| Action | RPC |
|---|---|
| List | `fn_list_departments_json` (`p_has_head` + paging) |
| Get | `fn_get_department_by_id` |
| Create | `fn_create_department` (`p_code`, `p_name`, `p_description`, `p_head_user_id`) |
| Update | `fn_update_department` |
| Delete | `fn_delete_department` |
| **Bulk delete** | `fn_bulk_delete_departments` |
| Options (used by Program & Course) | `fn_get_departments` |
| Head candidates | `fn_get_users_by_roles(['Faculty','Dean'])` |

Columns: Code, Name, Department Head — rendering `head_full_name — head_role_label`, or a warning badge **"Unassigned"**. Filter: `has_head` (All / Has Head / No Head Assigned).

Detail form fields: `code`* (helper *"Short unique code, e.g. CCS"*), `name`*, `head_user_id` (None + faculty/dean options, labelled `"<full_name> — <role_label>"`), `description`.

`isCodeDisabled={mode === 'edit'}` is correctly passed here — **the code is immutable after creation**, unlike Role, Term Type, Program Level, and Course Type.

No CSV import.

> **Gaps** `department.service.ts::getFacultyDeanUsers()` → `fn_get_faculty_dean_users` is exported with **zero call sites anywhere**, superseded by `fn_get_users_by_roles`. The `FacultyDeanUserOption` type is likewise orphaned.

---

## 4. Program Level Management

**Route** `/dean/program-level-management` — the year-level catalogue (e.g. UG / Undergraduate).

RPCs: `fn_list_program_levels_json` · `fn_get_program_level_by_id` · `fn_get_program_levels` · `fn_create_program_level` · `fn_update_program_level` · `fn_delete_program_level`.

Fields: `code`* (*"Short unique code, e.g. UG"*), `label`* (*"Display name, e.g. Undergraduate"*), `description`.

Modal-based CRUD with a **dedicated `viewMethods` form instance** and a `refreshKey` counter — this screen received the R2 structural fix. A missing-selection guard toasts *"No program level is selected. Close the dialog and try again."* rather than silently no-op'ing.

> **Gaps**
> - `isCodeDisabled` exists on the form but is never passed — codes remain editable.
> - QA item **R2 (program level edit won't save)** is still marked **needs runtime repro**. A full static audit found no defect on the happy path; three structural defects were removed anyway (shared view/edit form instance, `handleSwitchToEdit` not setting `selectedId`, and the silent `if (!selectedId) return`). The symptom was never reproduced to confirm closure.

---

## 5. Program Management

**Route** `/dean/program-management`

| Action | RPC |
|---|---|
| List | `fn_list_programs_json` (`p_department_ids`, `p_program_level_ids`, `p_is_active` + paging) |
| Get | `fn_get_program_by_id` |
| Options | `fn_get_programs` |
| Create | `fn_create_program` |
| Update | `fn_update_program` |
| Delete | `fn_delete_program` |
| Bulk delete | `fn_bulk_delete_programs` |
| **Bulk CSV create** | `fn_bulk_create_programs` |

Payload: `p_code`, `p_name`, `p_department_id`, `p_program_level_id`, `p_total_units`, `p_years_duration`, `p_description`, `p_is_active`.

Columns: Code, Name, Department Name, Program Level, Status badge. Checkbox column enabled — bulk delete works correctly here.

Filters: department (multi), program level (multi), active.

Validation: `code`*, `name`* (*"Full program name, e.g. BS Computer Science"*), `department_id`*, `program_level_id`*, `total_units` (optional), `years_duration`* (1–8), `description`.

`isCodeDisabled` **is** passed on update — code immutable after creation.

CSV template: `code, name, department_code, program_level_code, years_duration, total_units, description, is_active`. Bulk errors formatted `Row {row} ({code}): {message}`.

> **Gaps** `years_duration` has an RHF rule of `min 1` and helper text *"Standard duration in years (1-8)"*, but the widget's `fieldProps.min` is **2**. The rule, the helper, and the control disagree.

---

## 6. Course Type Management

**Route** `/dean/course-type-management` — the course-kind catalogue (LEC, LAB, …).

RPCs: `fn_list_course_types_json` · `fn_get_course_type_by_id` · `fn_get_course_types` · `fn_create_course_type` · `fn_update_course_type` · `fn_delete_course_type`.

Fields: `code`* (*"Short unique code, e.g. LEC"*), `label`* (*"Display name, e.g. Lecture"*), `description`.

Structurally identical to Program Level: modal CRUD, `refreshKey`, no checkbox, no filter, no CSV.

> **Gaps** `isCodeDisabled` never passed.

---

## 7. Course Management

**Route** `/dean/course-management` — the most complex Dean screen, because of the prerequisite editor and the LEC/LAB split.

| Action | RPC |
|---|---|
| List | `fn_list_courses_json` (`p_department_ids`, `p_course_type_ids`, `p_is_active` + paging) |
| Get | `fn_get_course_by_id` |
| Options | `fn_get_courses` (`p_exclude_ids`) |
| Create | `fn_create_course` |
| Update | `fn_update_course` |
| Delete / bulk delete | `fn_delete_course` / `fn_bulk_delete_courses` |
| Bulk CSV create | `fn_bulk_create_courses` |

Columns: Code, Title, Department, Course Type, Units (`total_units`), Status. Checkbox enabled. Modals are `w-250` (wide) to fit the prerequisite table.

Numeric rules: `lecture_units`* 0–10, `laboratory_units`* 0–10 (split only), `credit_hours` optional 0–20. `courses.total_units` is a **generated column** = `lecture_units + laboratory_units`.

### The LEC/LAB split rule

This is a genuinely clever design that deserves to be understood before anyone proposes changing it.

The `is_split` checkbox renders **only on create**. With `p_is_split = true`, `fn_create_course` writes **two `courses` rows** — `<CODE>_LEC` and `<CODE>_LAB` — each with its own units. From that moment they are two ordinary, fully independent courses: separate curriculum-map entries, separate sections, separate enrollments, separate final grades, separate transcript lines.

That is exactly the "enrolled separately, printed as separate report-card lines" requirement, achieved with **no extra schema**. An alternative `sections.delivery_mode` model was built and then **rejected and reverted** — see [13 §QA F1](13-roadmap-and-status.md) for the full reasoning, which is worth reading before touching this area.

> **Gaps — one of these is a real data-loss bug**
> - 🔴 **`updateCourse` sends `p_laboratory_units: null` unconditionally and omits `p_is_split` entirely.** Editing *any* split course — even to fix a typo in the title — **silently wipes its laboratory units**. The form loads `laboratory_units` into state and then never sends it back.
> - **`is_split` has no backing column**, so `fn_get_course_by_id` cannot return it. The edit form reads `result.data.is_split` and gets `undefined`. The create path works; only round-tripping is broken.
> - **Nothing records that `<CODE>_LEC` and `<CODE>_LAB` came from the same parent.** Pairing is by code convention only.
> - **No auto-pairing at enrolment** — the registrar enrols into each separately. (This is arguably correct: component-only enrolment is a real flow for transfer credit and single-component retakes.)

### The prerequisite editor

A four-column `CommonFormTable` with fully custom cells:

| Cell | Behaviour |
|---|---|
| **Kind** | `course` or `standing`. Changing it **resets** `course_id`, `year_level_required`, and `minimum_grade`. |
| **Course / Year Level** | For `standing`, renders Year 1–6 Standing options. For `course`, renders course options **minus courses already chosen in other rows** and minus the course being edited (so a course can't require itself). |
| **Type** | `Required \| Co-requisite \| Recommended`. Selecting `Co-requisite` **clears** `minimum_grade`. |
| **Min Grade** | Options `—, 1.0 … 3.0`. **Disabled and blanked** when type is `Co-requisite` or kind is `standing`. |

The add-row button hides once every available course has been used.

CSV encoding: `prerequisites` column formatted `CS100:Required:2.0|MATH101:Co-requisite:` (pipe-separated triples).

> **Gaps**
> - **No validation on prerequisite rows at all.** A row with kind `course` and no course selected submits `course_id: null`.
> - **Create and update disagree on Co-requisite handling** — create nulls `minimum_grade` for Co-requisites; update passes it straight through.
> - **Standing prerequisites have no CSV encoding**, so bulk import can only express course prerequisites.

---

## 8. Curriculum Map Management

**Route** `/dean/curriculum-map-management` — builds and prints a program's course-by-year-by-term prospectus.

**Not a `CommonTableCard`.** A bespoke `CommonCard` with two selects, `TableCardControls`, and one AG Grid per term.

| Action | RPC |
|---|---|
| Load map | `fn_get_curriculum_map` (`p_program_id`, `p_school_year_id`) |
| Create entry | `fn_create_curriculum_map_entry` |
| Update entry | `fn_update_curriculum_map_entry` |
| Delete entry | `fn_delete_curriculum_map_entry` |
| Bulk CSV create | `fn_bulk_create_curriculum_map` |

Selects fed by `fn_get_programs`, `fn_get_school_years`, `fn_get_term_types`, `fn_get_courses`.

**Controls:** Program select, School Year select (`All School Years` default), then Create (**rendered only once a program is selected**), Upload CSV, Download CSV, and an extra **Print** action — disabled unless a program is selected *and* entries exist — calling `window.print()`.

**Grouping** (`useCurriculumMapGrouped`): groups by `${year_level}-${summer|regular}`, where summer is detected by a `/summer/i` regex against **either** `term_type_code` or `term_type_label`. Group labels come from `YEAR_LEVEL_LABELS` (FIRST…SIXTH YEAR), summer groups suffixed `" — SUMMER"`. Sorted by year, regular before summer; terms by `term_type_sequence`; entries by `sequence`.

**Per-term table:** Code, Title, Lec, Lab, Pre-req (comma-joined codes or `None`), an Elective badge column, and a delete column. A **pinned bottom row** with sentinel `id: '__total__'` renders "Total Units", stuffing the total into the `lecture_units` field with every cell renderer special-casing the sentinel.

**Print layout:** a `print-area` wrapper plus a print-only header hard-coding *"Arellano University / Jose Abad Santos Campus"*, the program label, and `Effective SY <label>`. The action column carries `no-print` classes.

CSV template: `program_code, course_code, year_level, term_type_code, school_year_code, sequence, is_elective`.

> **Gaps**
> - 🔴 **The trash icon deletes an entry immediately with no confirmation prompt** — the only Dean list without one.
> - **No duplicate-course detection.** The same course can be mapped into two different terms of the same program with no warning.
> - **No validation of the summed units against the program's `total_units`.** The prospectus can silently under- or over-run the degree requirement.
> - The summer detection is a **regex on a label string** — a term type labelled "Midyear" is not detected as summer and will be grouped as a regular term.
> - `useCurriculumTableConfig` accepts an `onView` callback and **ignores it**; row-click handling actually lives in `CurriculumTermTable`.
> - Three hand-rolled `CommonModal`s replace `CommonTableCard`'s built-ins, so this screen doesn't benefit from the shared discard-changes guard.

---

## 9. Section Management

**Route** `/dean/section-management` — where courses become actual offerings with a teacher, room, and slots.

| Action | RPC |
|---|---|
| List | `fn_list_sections_json` (`p_term_ids`, `p_course_ids`, `p_statuses` + paging) |
| Get | `fn_get_section_by_id` |
| Options | `fn_get_sections`, `fn_get_terms` |
| Faculty options | `fn_get_users_by_roles(['Faculty'])` |
| Create | `fn_create_section` |
| Update | `fn_update_section` |
| Delete / bulk delete | `fn_delete_section` / `fn_bulk_delete_sections` |
| Bulk CSV create | `fn_bulk_create_sections` |
| **Copy Grading Setup** | `fn_copy_section_setup_to_sections` |

Create payload: `p_term_id`, `p_course_id`, `p_faculty_id`, `p_section_code`, `p_room`, `p_max_slots`, and **`p_status: 'Open'` hard-coded** — the status field is hidden on create and only appears on edit.

Statuses: `Open | Full | Ongoing | Closed | Cancelled`. Badge map: Open=success, Full=warning, Ongoing=info, Closed=error, **Cancelled=info**.

Columns: Section Code, Term, Course Code, Course Title, Faculty, Room, Max Slots, Status. Checkbox enabled.

Form: `section_code`* (*"Section identifier, e.g. BSCS-1A"*), `term_id`*, `course_id`*, `faculty_id` (optional — *"Assigned instructor (optional)"*), `room`, `max_slots`* (1–999), `status`* (edit only).

CSV template: `term_label, course_code, faculty_email, section_code, room, max_slots` (defaulting to 40).

### Grading schema inheritance

`fn_create_section` and `fn_bulk_create_sections` (in `docs/sql/grading-schema-inheritance.sql`) **auto-seed the new section's grading components** by cloning the institutional `grading_component_templates` onto the term's grading periods. Every section therefore starts from a valid default rather than requiring the faculty member to rebuild the schema from scratch. This was roadmap item 0.2b. Full semantics in [11](11-grading-engine.md).

### Copy Grading Setup

A row action opening `CopySectionSetupModal`: a multi-select of target sections (source filtered out) with the validator *"Select at least one target section"*. Helper: *"Existing components in each target period are replaced. Periods already holding recorded grades are skipped."*

Server rules: `fn_assert_role('Dean','Admin')`; empty targets, missing source, or a source with no components each produce a soft error; the source id is skipped if included in targets; per target it calls `fn_seed_term_grading_periods` then matches periods **by `sequence`**, accumulating a `skipped` array.

> **Gaps**
> - 🔴 **The course filter is dead UI.** `course_ids` exists in `SectionFilterValues`, is initialised to `[]`, and is forwarded to the RPC as `p_course_ids` — but **`SectionFilterForm` renders no course field.** Filtering sections by course is implemented end-to-end in types, service, and SQL, and is unreachable from the interface. On a screen that will hold hundreds of rows, this is the filter most likely to be wanted.
> - **`Cancelled` renders as an info badge** — a cancelled section reads as merely informational rather than terminal.
> - `SectionForm` fetches terms and faculty options **on every mount**, so the create, edit, and view modals each independently re-fetch the same two lists.
> - Faculty assignment is optional at creation, which is what produces the Dean dashboard's "unassigned sections" panel — reasonable, but nothing ever forces resolution before a term goes Ongoing.

---

## 10. Faculty Load & Schedule Conflicts

**Route** `/dean/faculty-load` (list) · `/dean/faculty-load/:facultyId` (detail)

Page header, a **Term select** (`All Terms` + `fn_get_terms`) applying to both tabs, then a two-tab menu: **Load** and **Conflicts**.

### Load tab

`fn_list_faculty_load_json` (`p_term_id` + paging). Columns: Faculty, Email, Sections, Units, Hrs/Week, Students, and a Schedule badge reading `"{n} conflict(s)"` in error variant or `"No conflicts"` in success.

**Fully read-only** — no create, edit, delete, filter modal, checkbox, or sort modal. Row click → the detail page, carrying `?termId=` when a term is selected.

### Conflicts tab

`fn_list_schedule_conflicts(p_term_id)`, called with **`{ silent: true }`** — the **only silent RPC in the entire codebase**. No global spinner, and failures are swallowed: the panel only reads `result.data`.

The report contains `faculty_conflicts[]`, `room_conflicts[]`, and matching counts. Two sections render: "Faculty double-booking (n)" and "Room double-booking (n)". Each row reads `section_a overlaps section_b on {day}, {start} – {end}`, with room conflicts adding *"Assigned faculty: …"*. Empty state: *"No schedule conflicts were found."*

### Detail page

`fn_get_faculty_load_detail(p_faculty_id, p_term_id)`. Back button, faculty name and email, then **three summary tiles computed client-side**: `Sections` = array length, `Total Units` = Σ units, `Enrolled Students` = Σ enrolled counts.

Assigned Sections list: per card, `section_code — course_code course_title`, term, units, enrolled count, then each schedule slot as `{day} {start} – {end} · {room}`.

> **Gaps**
> - **Conflict detection failures are completely invisible.** Because the call is silent and only `result.data` is read, a failed conflict query renders exactly like "no conflicts found." On a screen whose entire purpose is surfacing scheduling problems, **the failure mode is indistinguishable from the all-clear**. This is the most dangerous instance of the SF6 silent-read class in the system.
> - The panel ignores the server-provided `faculty_conflict_count` / `room_conflict_count` and recomputes from array length.
> - The detail page is **read-only with no reassignment capability** — the Dean can see that a faculty member is overloaded or double-booked and must go back to Section Management to do anything about it. There are no links from a listed section to that section.
> - The Back button **drops the `termId` param**, so returning from a detail page resets the filter to "All Terms".
> - The detail page has no loading or error state — `detail` stays `null` and the header shows `—`.
> - Three summary tiles are computed client-side, a small thick-DB violation.

---

## 11. Dean gaps summary

| # | Gap | Impact |
|---|---|---|
| 1 | **Editing any split course silently wipes its laboratory units** | 🔴 Data loss on a routine action |
| 2 | **Schedule-conflict failures are indistinguishable from "no conflicts"** | 🔴 Silent failure on a safety-critical screen |
| 3 | **Curriculum map entries delete with no confirmation** | 🔴 Irreversible, unprompted |
| 4 | **Section course filter fully implemented but unreachable from the UI** | 🟠 Dead feature on the highest-volume screen |
| 5 | **Dashboard's primary CTA doesn't deep-link to the section it names** | 🟠 The main workflow dead-ends |
| 6 | **No prerequisite row validation**; create/update disagree on Co-requisites | 🟠 Bad data reaches the DB |
| 7 | **No duplicate-course or unit-total validation in curriculum maps** | 🟠 Invalid prospectuses possible |
| 8 | **Faculty Load detail is read-only with no path to act** | 🟠 Diagnosis without remedy |
| 9 | **`is_split` not round-trippable**; no `_LEC`/`_LAB` parent linkage | 🟠 Structural gap in the split model |
| 10 | Summer detection is a regex on a label string | 🟡 "Midyear" misgroups |
| 11 | `isCodeDisabled` never passed on Program Level and Course Type | 🟡 Codes editable post-creation |
| 12 | `years_duration` rule (min 1) vs widget (min 2) mismatch | 🟡 |
| 13 | `SectionForm` refetches options on every modal mount | 🟡 Wasteful |
| 14 | `Cancelled` section renders as an info badge | 🟡 Misleading |
| 15 | 8 of 11 sidebar items share one icon; Department nav de-highlights on detail | 🟡 Navigation quality |
| 16 | `getFacultyDeanUsers` / `fn_get_faculty_dean_users` entirely unreferenced | ⚪ Dead code |
| 17 | Standing prerequisites have no CSV encoding | ⚪ Partial bulk import |
