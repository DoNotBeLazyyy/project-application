# 03 — Data Model & SQL Inventory

The shape of the database: tables by owning role, the enum vocabulary, the mandatory conventions every table must satisfy, the RPC naming and pagination contracts, and a complete inventory of the 47 SQL scripts that define the system.

## Contents

- [1. Mandatory table conventions](#1-mandatory-table-conventions)
- [2. Tables by owning role](#2-tables-by-owning-role)
- [3. Enums](#3-enums)
- [4. RPC naming conventions](#4-rpc-naming-conventions)
- [5. The pagination contract](#5-the-pagination-contract)
- [6. The SQL script inventory](#6-the-sql-script-inventory)
- [7. 🚨 The provenance problem](#7--the-provenance-problem)

**Related chapters:** [01 — Architecture](01-architecture.md) · [02 — Auth & RBAC](02-auth-and-rbac.md)

---

## 1. Mandatory table conventions

Every table in `public` is required to satisfy all of these.

### Primary key
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### The six audit columns
```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ,
deleted_at  TIMESTAMPTZ,
created_by  UUID DEFAULT auth.uid(),
updated_by  UUID,
deleted_by  UUID
```

### The audit trigger
```sql
DROP TRIGGER IF EXISTS trg_{table}_updated_audit ON public.{table};
CREATE TRIGGER trg_{table}_updated_audit
    BEFORE UPDATE ON public.{table}
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();
```

### Soft deletes only
No hard `DELETE` anywhere. Deletion sets `deleted_at = now(), deleted_by = auth.uid()`. Every read filters `WHERE deleted_at IS NULL`.

### Partial unique indexes, never inline UNIQUE
Because soft-deleted rows must not block re-use of a code:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uidx_{name}
    ON public.{table} ({columns})
    WHERE deleted_at IS NULL;
```

> **This convention caused a real production bug.** `fn_upsert_student_section_color` used `ON CONFLICT ON CONSTRAINT idx_student_section_colors_unique` — but a partial unique *index* is not a table *constraint*, so the RPC failed at runtime with `constraint … does not exist`. The fix (QA item B1) was to use the column-list form: `ON CONFLICT (student_id, section_id) WHERE deleted_at IS NULL`.

### Foreign keys
Always `ON DELETE RESTRICT`.

### Idempotency
`CREATE TABLE IF NOT EXISTS` · `ADD COLUMN IF NOT EXISTS` · `DROP POLICY IF EXISTS` before every `CREATE POLICY` · `DROP TRIGGER IF EXISTS` before every `CREATE TRIGGER` · `CREATE OR REPLACE FUNCTION` · enums wrapped in a `DO $$ … EXCEPTION WHEN duplicate_object THEN NULL; END $$`.

### RLS
Every table is supposed to `ENABLE ROW LEVEL SECURITY` with explicit SELECT, INSERT, and UPDATE policies. **In practice only ~14 of ~55 tables have policies** — see [02 §11](02-auth-and-rbac.md).

### No SQL comments
Zero `--` or `/* */` in any SQL file. Naming carries the meaning.

---

## 2. Tables by owning role

~55 tables in `public`, grouped by the role that owns them under the single-responsibility model.

### Admin / system
`users` · `user_roles` · `roles` · `school_years` · `terms` · `term_types` · `system_settings` · `notifications` · `academic_thresholds` · `grade_audit_logs`

### Dean / academic architecture
`departments` · `programs` · `program_levels` · `courses` · `course_types` · `course_prerequisites` · `curriculum_maps` · `sections` · `section_schedules`

### Registrar / records
`enrollments` · `students` · `student_lifecycle_events` · `section_final_grades` · `student_clearances`† · `clearance_requirements`†

† **Clearances were cut from scope.** The tables remain and the admin dashboard still counts `pending_clearances`, but no feature manages them.

### Faculty / instruction

**Assessment domain:**
`assessment_items` · `assessment_questions` · `assessment_question_choices` · `assessment_submissions` · `assessment_attachments` · `assessment_timer_sessions` · `assessment_timer_heartbeats` · `student_answers` · `assessment_item_rubrics`

**Attendance:**
`attendance_sessions` · `attendance_records`

**Grading:**
`grading_config` · `grading_components` · `grading_component_templates` · `grading_periods` · `grading_period_templates` · `grade_transmutation_tables` · `special_grade_configs`

**Rubrics:**
`rubrics` · `rubric_criteria` · `rubric_evaluations`

**Content & communication:**
`modules` · `course_materials` · `material_completions` · `announcements` · `announcement_sections` · `discussion_threads` · `discussion_posts`

### Evaluation
`evaluation_templates` · `evaluation_questions` · `evaluation_responses` · `evaluation_period_locks` · `evaluation_template_programs`

### Analytics (Phase 0.5 foundation)
`competencies` · `assessment_question_competencies` · `competency_alignments`

### Events & student preferences
`events` · `event_sections` · `student_section_colors`

---

## 3. Enums

Twenty `CREATE TYPE public.*_type AS ENUM` declarations, plus one added later for evaluation scope.

| Enum | Notable values |
|---|---|
| `announcement_audience_type` | `Global`, `Faculty`, `Student`, `Section` — **note: Admin, Dean, and Registrar are not addressable audiences** |
| `assessment_type` | Quiz, Exam, Activity, Assignment, Project, Lab Report |
| `question_type` | Multiple Choice, True or False, Short Answer, Essay, Fill in the Blank, Matching, File Upload |
| `attendance_status_type` | Present, Absent, Late, Excused |
| `audit_action_type` | Insert, Update, Delete |
| `civil_status_type` | — |
| `clearance_status_type` | (cut feature) |
| `day_of_week_type` | — |
| `enrollment_status_type` | Enrolled, Dropped, Withdrawn, Completed, Failed, Incomplete |
| `evaluation_question_type` | Rating, Multiple Choice, Open Ended |
| `evaluation_scope_type` | `Period`, `Term` |
| `faculty_status_type` | — |
| `gender_type` | — |
| `grade_status_type` | Draft, Submitted, Approved, Released |
| `material_type` | File, Link, Video, Document, Slide, Other |
| `prerequisite_type` | Required, Co-requisite, Recommended |
| `section_status_type` | Open, Full, Ongoing, Closed, Cancelled |
| `student_status_type` | Active, Inactive, LOA, Graduated, Expelled |
| `submission_status_type` | Not Started, In Progress, Submitted, Late, Graded, Returned |
| `submission_timer_status` | Active, Submitted, Expired |
| `term_status_type` | Upcoming, Enrollment Open, Ongoing, Grading Period, Closed |

> **Note on `grade_status_type`:** the value `Submitted` exists and the registrar dashboard counts it as pending release, but **the release engine only processes `Draft` and `Approved`**. See [06 §2](06-role-registrar.md).

---

## 4. RPC naming conventions

Approximately 200 `fn_*` functions. The naming is consistent enough to predict, which is a real strength.

| Pattern | Purpose |
|---|---|
| `fn_get_<entity>_by_id` | Single-record read |
| `fn_get_<entity>` / `fn_get_<entity>s` | Option-list read (unpaged, for selects) |
| `fn_list_<entity>_json` | **Paginated list** — returns the `CommonListResDto`-shaped JSONB via `fn_build_pageable_dto`. Accepts `p_sort_col` / `p_sort_dir`. |
| `fn_create_<entity>` / `fn_update_<entity>` / `fn_delete_<entity>` | Single-record writes (delete is soft) |
| `fn_bulk_create_<entity>` / `fn_bulk_delete_<entity>` | Array-payload transactional writes |
| `fn_bulk_provision_users` | The user-specific bulk create |
| `fn_assert_*` | Raise-style authorization guard |
| `fn_can_*` / `fn_is_*` / `fn_owns_*` | Boolean authorization predicate |
| `fn_set_updated_audit()` | The shared audit trigger |

**Parameter prefix is always `p_`.** All parameters are named, never positional.

**Dynamic sorting** is applied with secure dynamic SQL — `EXECUTE format(...)` with `%I` for identifiers.

---

## 5. The pagination contract

Every list RPC returns a JSONB payload shaped exactly like the Spring Boot `CommonListResDto<T>`, produced by a single shared wrapper `fn_build_pageable_dto`. The frontend service returns that JSONB directly with no reshaping.

**The one rule that catches people:** the UI is 1-indexed, but the DTO's `number` and `pageNumber` properties are strictly **0-indexed**.

Two screens deliberately fake this contract because their underlying RPC is unpaged:
- **Grading period templates** — `buildPeriodListDto` wraps the full array so `CommonTableCard` can render it
- **Student grades** — injects a synthetic `row_id = "{enrollment_id}:{grading_period_id}"` because neither field alone is unique

---

## 6. The SQL script inventory

All 47 scripts in `docs/sql/`, grouped by what they introduced. The directory is **cumulative** — where the same `fn_*` is defined in more than one file, **the newest definition is the live one**.

### Foundations (Phase 0)

| File | Introduced |
|---|---|
| `rbac-guard.sql` | `fn_current_user_role_codes()`, `fn_assert_role()` — the guard primitives |
| `rbac-fix-definer-holes.sql` | Caller checks on `fn_list_grade_sheet` and `fn_list_section_students` — the cross-section grade leak fix |
| `active-role-contract.sql` | `fn_get_auth_context()`, `fn_assert_active_role()` (the latter is never called) |
| `academic-thresholds.sql` | The configurable honour/scholarship/standing table + 3 RLS policies |
| `audience-resolution-core.sql` | `fn_resolve_audience()`, `fn_preview_audience()` |
| `grading-schema-inheritance.sql` | Section grading auto-seeding, `fn_seed_section_grading`, the grading lock |
| `learning-analytics-foundation.sql` | `competencies`, `assessment_question_competencies`, `competency_alignments` + 9 RLS policies |

### Communication (Phase 1)

| File | Introduced |
|---|---|
| `announcements.sql` | Announcement CRUD, feeds, 6 RLS policies on `announcement_sections` |
| `notifications-ui.sql` | Notification list, unread count, mark-read |
| `events.sql` | Event CRUD and feeds, 6 RLS policies |
| `discussion.sql` | Threads and posts, 6 RLS policies |

### Content & assessment (Phase 2)

| File | Introduced |
|---|---|
| `content.sql` | Modules, materials, completions + 9 RLS policies |
| `content-duplication.sql` | `fn_duplicate_module_to_sections`, `fn_list_my_teaching_sections` |
| `assessment-file-answers.sql` | File-upload answers, `fn_get_assessment_questions_for_student` |
| `assessment-schedule-dates.sql` | The four schedule timestamps and their ordering rules |
| `question-bulk-import.sql` | `fn_bulk_import_questions` |
| `student-assessment-result.sql` | `fn_get_my_assessment_result` with server-side answer-key withholding |

### Records & academic (Phase 3)

| File | Introduced |
|---|---|
| `records-academic.sql` | `fn_resolve_record_student`, transcript, curriculum audit, lifecycle events, status change, program shift + 3 RLS policies |
| `registrar-bulk-enrollment.sql` | The whole enrollment state machine — target term, eligible sections, prerequisites, enroll, bulk enroll, drop |
| `student-schedule-conflict.sql` | `fn_get_schedule_conflicts`, conflict-authorization columns, `fn_get_student_schedule` |
| `batch-progression.sql` | Progression candidates, section planning, preview, run + the `Year Level Progression` event type |
| `subject-detail-lazy-tabs.sql` | `fn_get_subject_detail`, `fn_get_subject_assessments`, `fn_get_subject_grades` |

### Analytics (Phase 4)

| File | Introduced |
|---|---|
| `learning-analytics.sql` | **1,429 lines** — student insight, section insight, item analysis, risk scoring, mastery, trajectories |

### Accounts & admin depth (Phase 5)

| File | Introduced |
|---|---|
| `accounts-admin-depth.sql` | `fn_list_users_json`, multi-role `fn_update_user`, audit-log list, faculty load, schedule conflicts, `fn_copy_section_setup_to_sections` |
| `audit-live-functions.sql` | Live audit trigger and log plumbing |
| `role-management-unique.sql` | Uniqueness on role create/update |
| `dashboards.sql` | All five role dashboards |

### Grading policy

| File | Introduced |
|---|---|
| `transmutation-fixed-ladder.sql` | The 10-rung ladder, `fn_save_transmutation_table`, `fn_calculate_final_grade` |
| `grading-period-template-crud.sql` | Period template CRUD with nested components |
| `special-grade-configs-unique.sql` | Special grade uniqueness |
| `special-grade-configs-dedupe.sql` | Special grade de-duplication |
| `scheduled-grade-release.sql` | `release_at` column, the release engine, `fn_sweep_scheduled_grade_releases`, **the only `pg_cron` job** |

### Evaluation

| File | Introduced |
|---|---|
| `evaluation-crud.sql` | Template CRUD |
| `evaluation-pages.sql` | `fn_list_evaluation_templates_json` (earlier iteration) |
| `evaluation-sections.sql` | Multi-template sections, program scoping, `fn_check_evaluation_completion` + 3 RLS policies |
| `evaluation-scope.sql` | **Period-vs-Term scope** — and the *current* definitions of `fn_get_evaluation_form`, `fn_submit_evaluation`, `fn_list_my_grades`, `fn_create_term` |
| `evaluation-bulk-import.sql` | CSV import of templates |
| `section-student-evaluation.sql` | `fn_get_section_student_evaluation` (faculty's per-student view) |

### Rubrics (Phase 8)

| File | Introduced |
|---|---|
| `rubrics.sql` | Rubric CRUD, attach, rubric grading, copy-to-sections + 7 RLS policies; extends the student result payload |

### Security retrofit (Phase 7)

| File | Introduced |
|---|---|
| `security-retrofit.sql` | **2,424 lines** — `fn_assert_section_staff`, `fn_owns_submission`, `fn_assert_enrollment_access`, and ~47 existing RPCs re-created with guards |

### AI capstone

| File | Introduced |
|---|---|
| `ai-assistant.sql` | `fn_get_assistant_context` — the single read-only RPC the Edge Function may call |

### QA remediation

| File | Fixed |
|---|---|
| `phase-1b-sql-fixes.sql` | B1 section-colour `ON CONFLICT`, B2 timer column names, B3 `fn_get_admin_dashboard_stats` (created from nothing) |
| `phase-1c-sql-fixes.sql` | B5 multi-role `fn_update_user` |
| `phase-1-b7-attendance-access.sql` | B7 — normalised attendance to soft denials, added `fn_can_access_section_staff` |
| `qa-r1-r2-fixes.sql` | R1/R2 — dropped a stale `fn_list_school_years_json` overload, canonicalised `fn_create_school_year` and `fn_update_program_level` |
| `findings-2-remediation.sql` | Round-2 findings, including `fn_list_my_section_colors` |

---

## 7. 🚨 The provenance problem

This is the most consequential fact in this chapter, and it undermines confidence in everything above.

### There is no migration runner

Every script in `docs/sql/` is applied to live Supabase **by hand**. There is no ordering guarantee, no applied-migrations ledger, no rollback, and **no way to verify from the repository what is actually running in production**.

### The drift is documented, not hypothetical

The QA tracker records this as one of two systemic root causes. Confirmed instances:

| Symptom | Cause |
|---|---|
| `fn_update_user` 404 | Live had singular `p_role_code text`; the frontend sent `p_role_codes text[]`. The multi-role version in `accounts-admin-depth.sql` **was never applied**. |
| Term create fails | Live `fn_create_term` had 7 params; the frontend sent 8. Two conflicting definitions existed in `docs/sql/`. |
| Latent `PGRST203` hazard | Live carried **two overloads** of `fn_list_school_years_json` (5-arg and 6-arg) — the fingerprint of a signature change applied without dropping the old one. Any caller omitting `p_year` would hit an ambiguous-function error. |

### Functions that exist only on live

Several `fn_*` the frontend calls **have no definition in `docs/sql/` at all** — they exist only in the live database and, sometimes, in the frozen dump. Confirmed examples: `fn_bulk_delete_users`, `fn_delete_role`, `fn_get_transmutation_table`, `fn_get_grading_period_templates`, `fn_get_special_grade_configs`, `fn_delete_special_grade_config`, `fn_list_school_years_json`, `fn_list_term_types_json`, and most of the Dean-side catalogue functions.

### `supabase_ai_context.sql` is deliberately frozen and known stale

The 16,219-line `pg_dump` at the repo root is a point-in-time snapshot kept as a rough structural reference for tables, columns, and enums. It is **never regenerated** and must **never be run as a migration**.

It predates the RBAC retrofit entirely — `grep fn_assert_role` returns **zero hits** — so it cannot be used to verify any current guard. Over 100 of the `fn_*` names the frontend calls do not appear in it.

**Lookup order when checking whether an RPC, column, or enum value exists:**
1. `docs/sql/*.sql` — authoritative, and the only reliable source for function signatures
2. `supabase_ai_context.sql` — older baseline; usable for tables, columns, enums; **unreliable for functions**
3. If they disagree, `docs/sql/` wins

### What this means for everything else in this documentation

Every SQL-level claim in these chapters was verified against `docs/sql/`. That establishes **intent**. It does not establish what is running. The security posture described in [02](02-auth-and-rbac.md) in particular should be read as *"what the scripts say"*, not *"what is deployed"* — and the highest-value verification task in the whole project is to diff the live schema against `docs/sql/` and find out which is which.
