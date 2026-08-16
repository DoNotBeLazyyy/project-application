# 10 — The Assessment Engine

The most intricate subsystem in the LMS, and the only one that spans two roles end to end: faculty author and grade, students take. This chapter follows the data through its whole life rather than by screen — see [07 §5–7](07-role-faculty.md) and [08 §6–7](08-role-student.md) for the screen-level views.

## Contents

- [1. The object model](#1-the-object-model)
- [2. Question types](#2-question-types)
- [3. The schedule window](#3-the-schedule-window)
- [4. Publishing](#4-publishing)
- [5. The submission state machine](#5-the-submission-state-machine)
- [6. Timer sessions and heartbeats](#6-timer-sessions-and-heartbeats)
- [7. Answer capture and autosave](#7-answer-capture-and-autosave)
- [8. Grading: two modes](#8-grading-two-modes)
- [9. Result release and answer-key withholding](#9-result-release-and-answer-key-withholding)
- [10. Item analysis](#10-item-analysis)
- [11. Rubrics](#11-rubrics)
- [12. Bulk import and cross-section replication](#12-bulk-import-and-cross-section-replication)
- [13. Engine defect register](#13-engine-defect-register)

**Related chapters:** [07 — Faculty](07-role-faculty.md) · [08 — Student](08-role-student.md) · [11 — Grading Engine](11-grading-engine.md)

---

## 1. The object model

```
sections
   └── assessment_items ─────────────── the assessment itself
         ├── assessment_questions
         │      ├── assessment_question_choices
         │      └── assessment_question_competencies   (analytics tagging)
         ├── assessment_attachments                    ⚠ unreachable — see §13
         ├── assessment_item_rubrics ──→ rubrics ──→ rubric_criteria
         └── assessment_submissions ─── one per student per attempt
                ├── student_answers ──→ file_attachments (jsonb)
                ├── rubric_evaluations
                └── assessment_timer_sessions
                       └── assessment_timer_heartbeats
```

An `assessment_item` belongs to exactly one section (`section_id NOT NULL`). Replicating an assessment to another section produces an **independent copy**, not a shared master — a deliberate decision so that submissions, timers, grading, and analytics all continue to work unchanged.

An assessment optionally links to a **grading component**, which is how its scores flow into the grade calculation in [11](11-grading-engine.md). The link is optional: an unlinked assessment is taken and graded but contributes nothing to the final grade.

---

## 2. Question types

Seven types in the `question_type` enum.

| Type | Choices? | Answer stored as | Auto-graded |
|---|---|---|---|
| Multiple Choice | ✅ | `choice_id` | ✅ on save |
| True or False | ✅ | `choice_id` | ✅ on save |
| Matching | ✅ | `choice_id` | ✅ on save |
| Short Answer | ❌ | `answer_text` | ❌ manual |
| Essay | ❌ | `answer_text` | ❌ manual |
| Fill in the Blank | ❌ | `answer_text` | ❌ **neither** — see below |
| File Upload | ❌ | `file_attachments` jsonb | ❌ manual |

**Correct-answer semantics in the builder:** for `Multiple Choice` the correct-answer toggle is **multi-select** (multiple correct answers are expressible). For every other choice-based type it is **single-select**.

File Upload questions carry three extra authoring fields: `allowed_file_types` (a comma-separated string, split to an array on save), `max_file_size_mb`, and `max_file_count`.

> **Two type-level defects**
> - **`Matching` renders as a single-select dropdown** in `AssessmentQuestionCard`. A matching question fundamentally requires pairing N prompts to N responses; a single dropdown cannot express that. The type is authorable, savable, and unusable.
> - **`Fill in the Blank` is text-based, so it is not auto-graded** — but it is also not in `MANUAL_GRADE_TYPES` (`Essay`, `Short Answer`, `File Upload`), so the grading panel renders it **read-only with no editable points field**. A Fill in the Blank question can therefore never be scored by anyone.

---

## 3. The schedule window

Four timestamps plus a publish flag govern availability.

| Field | Meaning | Helper text shown to faculty |
|---|---|---|
| `scheduled_publish_at` | Auto-publish moment | "A past time publishes it immediately. Leave blank to publish manually." |
| `opens_at` | Students can start | "When students can start the assessment." |
| `due_at` | Deadline; later attempts are flagged late | "Submission deadline; attempts after this are marked late." |
| `closes_at` | Hard cutoff | "Hard cutoff; no submissions accepted after this time." |
| `show_results_at` | Score and answer key visible | "When students can view their scores and correct answers. Leave blank to release manually." |

**Server-enforced ordering** (`docs/sql/assessment-schedule-dates.sql`):

```
scheduled_publish_at ≤ opens_at < due_at ≤ closes_at
```
(specifically: `opens_at < due_at`, `opens_at < closes_at`, `closes_at >= due_at`, `scheduled_publish_at <= opens_at`)

Plus: `!show_all_questions` requires `questions_per_page >= 1`.

The client additionally validates that `due_at`, `closes_at`, and `show_results_at` are not in the past — unless the faculty ticks **`allow_past_dates`**, for backdating an assessment that already happened.

> **Gap** `allow_past_dates` is a **client-only field**. It is never sent to the database, and the database performs no past-date validation at all. The checkbox unlocks a client-side rule that has no server counterpart — which is harmless but means the guarantee is weaker than it looks.

---

## 4. Publishing

Two paths make an assessment visible:

1. **Manual** — `fn_publish_assessment` sets `is_published = true, published_at = now()`. It **refuses when there are no questions**: *"Cannot publish an assessment with no questions."*
2. **Scheduled** — `scheduled_publish_at <= now()` is treated as published by the read RPCs, without ever flipping the flag.

Ownership for publish/unpublish is a **raw inline `sections.faculty_id = auth.uid()`** — owner-only, not `fn_assert_section_staff`. This is one of the three different ownership predicates in the codebase (see [02 §12](02-auth-and-rbac.md)).

### 🔴 The publish-visibility inconsistency

Three RPCs disagree about what "published" means:

| RPC | Accepts `scheduled_publish_at <= now()`? |
|---|---|
| `fn_start_assessment_timer` | ✅ yes |
| `fn_get_assessment_for_student` | ✅ yes |
| `fn_get_subject_assessments` | ✅ yes |
| **`fn_get_assessment_questions_for_student`** | ❌ **no — requires `is_published = true`** |

A scheduled-publish assessment therefore appears in the student's list, passes the availability gate, **successfully starts an attempt** — and then the question fetch returns `{success: false, 'Access denied.'}`. The student is left on a broken page **having already burned an attempt** (see §5).

This is a two-line fix in one RPC and it is the highest-value SQL change available.

> **Gap** `fn_unpublish_assessment` has **no guard against unpublishing an assessment with live submissions.** Students mid-attempt lose access with no warning to anyone.

---

## 5. The submission state machine

```
                     fn_start_assessment_timer
                              │
                              ▼
   (none) ──────────────► In Progress ─────────────► Submitted
                              │                          │
                              │  now() > due_at          │
                              └────────────────────► Late │
                                                          │
                                    fn_grade_submission   │
                                  fn_grade_submission_rubric
                                                          ▼
                                                       Graded ──→ Returned
```

`Not Started` exists in the enum and is accepted by the save/submit guards, but `fn_start_assessment_timer` inserts directly at `In Progress`, so nothing ever occupies it.

`fn_submit_assessment` requires a submittable status, **refuses when `now() > time_limit_expires_at`**, computes `is_late = now() > due_at`, and marks the timer session `Submitted`.

### 🔴 There is no resume path

`fn_start_assessment_timer` **always INSERTs a new submission** with `attempt_number = COUNT(existing) + 1`. The client calls it unconditionally on every press of "Start Assessment" and never looks for an existing `In Progress` submission.

Consequences:
- A refresh, a back-navigation, or a dropped connection **consumes an attempt**
- At the default `max_attempts = 1`, **one refresh permanently locks the student out**
- The `saved_answer` prefill logic in `handleStart` is **dead in practice** — a brand-new submission has no answers to restore

The fix is a resume branch: look for an existing `In Progress` submission for this (enrollment, assessment) and return it instead of inserting. Everything else — the prefill logic, the timer, the answer upserts — already supports resumption. **The engine was designed for resume; only the entry point was not written.**

---

## 6. Timer sessions and heartbeats

`fn_start_assessment_timer` creates an `assessment_timer_sessions` row (`status='Active'`, `last_activity_at=now()`) alongside the submission, and computes `expires_at = now() + time_limit_minutes` when a limit is set.

The client runs a **30-second** `fn_record_heartbeat` interval. That RPC:
- 404s a missing session, or refuses a non-`Active` one
- **If `now() > server_expires_at`**, calls `fn_expire_overdue_submissions()` and returns "Session has expired."
- Otherwise inserts an `assessment_timer_heartbeats` row (with `client_ip = inet_client_addr()`) and bumps `last_activity_at`
- Returns `remaining_seconds`

The visible timer is a 1-second client interval against the server-issued expiry, turning error-coloured under 5 minutes and calling `handleSubmit` at zero.

### 🔴 The three-way timer failure

These compound into complete data loss on any timed assessment that actually runs out.

**a. The column mismatch.** `fn_record_heartbeat` reads **`server_expires_at`**. `fn_start_assessment_timer` writes **`expires_at`** and never populates `server_expires_at`. Both columns exist (there is even an index on `server_expires_at`). So the heartbeat's expiry branch **never fires**.

**b. The sweep is never scheduled.** `fn_expire_overdue_submissions` would force-submit overdue attempts with `feedback = 'Auto-submitted by server: time limit exceeded.'` It keys off the same unpopulated `server_expires_at`, and its **only caller is `fn_record_heartbeat`**. The only `cron.schedule` in the entire repository is `grade-release-sweep`. This function is dead code guarding against exactly the failure in (c).

**c. Auto-submit races itself.** `onExpire` fires *at* `expiresAt` and calls `handleSubmit`, which first awaits a `Promise.all` over **every** question's save. Only then does it call `fn_submit_assessment` — by which point `now() > time_limit_expires_at`, and the RPC refuses with *"Submission window has expired."*

**Net result: the submission is stranded `In Progress` forever.** The student's answers are all saved (autosave worked), but the submission is never submitted, never graded, and never counted. Nothing in the system will ever move it.

**d. Heartbeat responses are discarded.** The client `await`s `recordHeartbeat(subId)` with no result handling, so even a working expiry signal would produce no UI.

Minimum viable fix: populate `server_expires_at` on insert, fire `onExpire` ~30 seconds *before* expiry (or have `fn_submit_assessment` accept a grace window / auto-mark as expired rather than refusing), and schedule `fn_expire_overdue_submissions` on the existing cron.

---

## 7. Answer capture and autosave

**`fn_save_student_answer(p_submission_id, p_question_id, p_answer_text, p_choice_id)`**

Authorizes through `submissions ⋈ enrollments ⋈ students.user_id = auth.uid()` **and** requires `status IN ('In Progress','Not Started')`.

**Auto-grading happens here, on save.** If `p_choice_id` is supplied, it looks up `assessment_question_choices.is_correct` and sets `points_earned` to the question's full points when correct, `0` when incorrect, `NULL` otherwise. Upserts on `(submission_id, question_id)`.

Save points in the client:
- Every **page turn** (Previous and Next each await a full save of the visible page)
- **Submit** saves *all* questions, not just the visible page

There is **no idle autosave timer** — an assessment displayed with `show_all_questions = true` has exactly one save point: submit.

**`fn_save_student_answer_files`** takes the same gate plus a check that the question belongs to the submission's assessment, and **nulls out `answer_text` and `choice_id`** on conflict. It is called with **`{ silent: true }`**.

### Question shuffling

`ORDER BY CASE WHEN v_shuffle_q THEN random() ELSE aq.sequence::float END`, applied identically to choices.

> **Gap** **The shuffle is re-randomised on every call**, not seeded per submission. Any refetch reorders the questions under the student, and because paging slices by index, **the page contents change too**. A student on "Page 2 of 3" who triggers a refetch sees a different set of questions. Seeding on `submission_id` would fix this.

### File uploads

`FileUploadAnswer` validates in order — count against `max_file_count`, extension against `allowed_file_types` (case-insensitive suffix match; an empty list means any type), then size against `max_file_size_mb` — surfacing each failure in a red line. Then it uploads sequentially to `submissions/{submissionId}/{questionId}/{timestamp}_{filename}` with `upsert: false`.

> **Gaps**
> - **A mid-batch upload failure aborts the whole batch and orphans everything already uploaded** — those objects exist in storage but `persist()` is never called, so no DB row references them.
> - **Removing a file deletes only the DB reference.** The storage object is never deleted. Storage grows monotonically.
> - **Persistence is silent** — a failed `fn_save_student_answer_files` shows the student nothing; the file appears attached and isn't.

---

## 8. Grading: two modes

The mode is a per-assessment flag, `use_rubric_scoring`, set on the rubric attach panel.

### Per-question mode — `fn_grade_submission(p_submission_id, p_feedback, p_answers)`

`AnswerCard` renders:
- **Auto-graded types** (`Multiple Choice`, `True or False`, `Matching`) — read-only `✓ Correct` / `✗ Incorrect` plus `{points_earned} / {points} pts`
- **Manual types** (`Essay`, `Short Answer`, `File Upload`) — an editable points input (min 0, max the question's points, step 0.01) and a Grader Notes textarea

> **Gap** **Auto-graded answers cannot be overridden.** A faculty member who discovers a mis-keyed multiple-choice question has no way to correct any student's score from this screen — or from anywhere. The only recourse is editing the choice's `is_correct` and having every student retake.

### Rubric mode — `fn_grade_submission_rubric(p_submission_id, p_feedback, p_evaluations)`

Resolves the section via `fn_resolve_submission_section`, then `fn_assert_section_staff`. Refuses when no rubric is attached, when a criterion doesn't belong to the attached rubric, or when `points < 0 OR points > max_points`. Upserts `rubric_evaluations` per criterion, then sets `raw_score = final_score = SUM(points)`, `status = 'Graded'`, `graded_at`, `graded_by`.

### 🔴 The denominator mismatch

In rubric mode, `raw_score` is denominated in **rubric points**. But `fn_calculate_final_grade` computes a component's contribution as:

```
component_score = SUM(assessment_submissions.final_score)
component_max   = SUM(assessment_items.total_points)
weighted        = (component_score / component_max) * weight
```

It divides by the **assessment's** `total_points`. If a rubric totals 50 and the assessment is configured at 100, every rubric-graded student's contribution is **silently halved**. If the rubric totals 200 against an assessment of 100, they get 200%.

**Nothing validates the two against each other.** Not the rubric builder, not the attach panel, not the grading function. This is a silent, systematic grade-corruption bug that only manifests once rubric grading is combined with weighted grading — which is exactly the intended workflow.

---

## 9. Result release and answer-key withholding

`fn_get_my_assessment_result` computes:

```sql
v_results_available := status IN ('Graded','Returned')
                       AND (show_results_at IS NULL OR show_results_at <= now())
```

**Every score-bearing field is wrapped in `CASE WHEN v_results_available THEN … ELSE NULL END`:**

`raw_score` · `final_score` · `feedback` · per-answer `points_earned` · `is_correct` · `grader_notes` · `explanation` · and crucially **`choices[].is_correct`**

**The answer key is withheld server-side, not hidden in the UI.** A student inspecting the network response before release sees nulls, not the key. This is a control that is very commonly implemented client-side and got wrong, and it is done correctly here — worth a slide in a defense.

Note this release gate is the **assessment-level `show_results_at`**, entirely independent of the registrar's grading-period grade release in [11](11-grading-engine.md). A student can see a quiz score long before the period grade is released, and vice versa. That is a reasonable design but it means "released" means two different things in two places.

Unanswered questions still appear in the result with nulls, so the student sees what they skipped.

---

## 10. Item analysis

`fn_get_assessment_item_analysis` computes classical test theory statistics server-side.

**Five summary tiles:** Submissions · Mean · Median · High · Std Dev

**Per question:**
- Tagged competency codes as chips
- A **difficulty badge**: `{difficulty_label} · p={difficulty_index}` — the classical p-value (proportion answering correctly)
- A **discrimination badge**: `{discrimination_label} · D={discrimination_index}` — how well the item separates high from low performers

Both indices and both labels are computed in `docs/sql/learning-analytics.sql`. Read-only.

This is genuinely strong material for a thesis — psychometric item analysis computed in the database, feeding directly from live submissions. It is undersold by having no export.

---

## 11. Rubrics

Delivered as Phase 8, marked "only if time holds" — and it landed.

**Model:** `rubrics` → `rubric_criteria` (title, description, `max_points`) → `rubric_evaluations` (per submission, per criterion). Attachment is via `assessment_item_rubrics`.

**Rules** (`docs/sql/rubrics.sql`):
- All writes guard `fn_assert_section_staff`
- Title required; at least one criterion; **each criterion's `max_points` must be > 0**
- `rubrics.total_points` is recomputed server-side as the sum of criteria
- `fn_set_assessment_rubric` refuses `use_scoring` with a null rubric, and refuses a rubric from a different section
- `fn_copy_rubric_to_sections` requires the caller to teach the source **and every target**, skips the source, deep-copies criteria, returns `copied_count`
- 7 RLS policies across the three tables

> **Gaps**
> - The client enforces only `required` on Max Points, not `> 0`, so `0` reaches the server and is rejected there.
> - 🟠 **`fn_create_rubric` returns that rejection *after* having already inserted the `rubrics` row and any preceding criteria.** It `RETURN`s mid-loop rather than raising, so nothing rolls back. **A rejected save leaves a partial rubric in the database.** Changing the `RETURN` to a `RAISE` would make the whole function transactional.
> - The denominator mismatch in §8.

---

## 12. Bulk import and cross-section replication

### Question bulk import

`fn_bulk_import_questions(p_assessment_id, p_questions)` returns `{provisioned_count, errors:[{row, code, message}]}`, which the service maps into `"Row {n}: {message}"` plus a structured error grid.

Template columns: `question_text`, `question_type`, `points`, `is_required`, `explanation`, `choices` — the last encoded as `Paris*|London|Rome`, pipe-separated with `*` marking correct.

This "kills the most repetitive faculty task" per the roadmap, and it works.

### Duplicate to sections

`fn_duplicate_assessment_to_sections(p_assessment_id, p_section_ids)` — one transaction deep-copying the item, its questions, its choices, and its attachments into each target as an **independent copy**, remapping `grading_component_id` to the same-named component in each target section (null if none). Guarded by a check that the caller teaches the source **and** every target.

The sibling `fn_duplicate_module_to_sections` does the same for content, and `fn_copy_rubric_to_sections` for rubrics. Three instances of one consistent pattern — a genuinely well-executed cross-cutting standard.

---

## 13. Engine defect register

Ordered by severity. Items 1–5 are, collectively, the biggest functional risk in the system.

| # | Defect | Consequence |
|---|---|---|
| 1 | **No resume path** — every start burns an attempt | 🔴 A refresh locks the student out at `max_attempts = 1` |
| 2 | **Timer auto-submit is refused by the server** | 🔴 Submission stranded `In Progress` forever |
| 3 | **`server_expires_at` written nowhere, read by the heartbeat and the sweep** | 🔴 The safety net for #2 cannot fire |
| 4 | **`fn_expire_overdue_submissions` is not scheduled by any cron** | 🔴 Second safety net also absent |
| 5 | **`fn_get_assessment_questions_for_student` ignores `scheduled_publish_at`** | 🔴 Scheduled assessments start, then dead-end on "Access denied." |
| 6 | **Rubric points vs assessment `total_points` never reconciled** | 🔴 Silently wrong weighted grades |
| 7 | **Heartbeat responses discarded** | 🟠 No signal on an expired session |
| 8 | **`Matching` cannot express a matching answer** | 🟠 Type is authorable and unusable |
| 9 | **`Fill in the Blank` can never be scored** — not auto-graded, not in `MANUAL_GRADE_TYPES` | 🟠 Type is authorable and ungradeable |
| 10 | **Auto-graded answers cannot be overridden** | 🟠 A mis-keyed question is uncorrectable |
| 11 | **Unpublish allowed with live submissions** | 🟠 |
| 12 | **Shuffle re-randomises per call, not per submission** | 🟠 Question order and paging shift under the student |
| 13 | **File upload: mid-batch failure orphans objects; removal never deletes them** | 🟠 Storage leak |
| 14 | **File persistence is silent** | 🟠 |
| 15 | **Assessment attachments unreachable** — `AssessmentAttachmentPanel` is dead code, so `fn_create_assessment_attachment` / `fn_delete_assessment_attachment` have no caller | 🟠 Faculty cannot attach files |
| 16 | **Assessment delete has no confirmation** | 🟠 |
| 17 | **Partial rubric persists after a rejected create** | 🟡 Non-transactional |
| 18 | **Question point sum never reconciled with `total_points`** | 🟡 Wrong denominators |
| 19 | **No idle autosave** — with `show_all_questions`, submit is the only save point | 🟡 |
| 20 | **Unknown question types render no input** | 🟡 |
| 21 | **No drag-to-reorder for questions** | 🟡 |
| 22 | **Item analysis has no export** | 🟡 Strong feature, hard to evidence |
| 23 | `allow_past_dates` is client-only with no server counterpart | ⚪ |
| 24 | `Not Started` status is unreachable | ⚪ |
