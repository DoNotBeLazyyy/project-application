# 08 — Student Role

**Responsibility boundary:** learning. Students view their schedule and subjects, consume course content, take assessments, submit faculty evaluations, and view grades, curriculum progress, and personal analytics. They write almost nothing except submissions and evaluations.

**This chapter contains the most severe functional defects in the system**, concentrated in the assessment-taking flow (§6).

## Contents

- [1. Routes and navigation](#1-routes-and-navigation)
- [2. Dashboard](#2-dashboard)
- [3. My Schedule](#3-my-schedule)
- [4. My Subjects](#4-my-subjects)
- [5. Subject Detail](#5-subject-detail)
- [6. ⭐ Taking an assessment](#6--taking-an-assessment)
- [7. Assessment Result](#7-assessment-result)
- [8. My Grades](#8-my-grades)
- [9. Faculty Evaluation](#9-faculty-evaluation)
- [10. Curriculum](#10-curriculum)
- [11. Insight](#11-insight)
- [12. Student gaps summary](#12-student-gaps-summary)

**Related chapters:** [10 — Assessment Engine](10-assessment-engine.md) · [11 — Grading Engine](11-grading-engine.md) · [12 — Analytics & AI](12-analytics-and-ai.md)

---

## 1. Routes and navigation

| Label | Path |
|---|---|
| Dashboard | `/student` |
| Schedule | `/student/schedule` |
| Subject | `/student/subjects` |
| Grade | `/student/grade` |
| Evaluate | `/student/evaluations/:enrollmentId?/:gradingPeriodId?` |
| Curriculum | `/student/curriculum` |
| Insight | `/student/insight` |

Plus un-navigated routes: `/student/subjects/:enrollmentId`, `.../assessments/:assessmentId`, `.../assessments/:assessmentId/result`, `/student/profile`.

> **Gaps** The "Subject" nav item uses an **exact** path match, so it de-highlights on every subject sub-route — including while taking an assessment, the student loses all navigational context. Same `'Dean'` display-name fallback. Four of seven items share one icon.

---

## 2. Dashboard

**Route** `/student` · **RPCs** `fn_get_student_dashboard` (no params) and `fn_get_student_insight` (both nulls), plus the shared feeds.

Composition: three stat tiles → `StudentInsightSummaryCard` (with "View Insight") → Upcoming Assessments → Announcements + Events → `InstitutionalIdentityCard`.

Stat tiles: Enrolled Subjects, Upcoming Assessments, Grades to View.

**Upcoming Assessments card:** per item a type badge, title, `{course_code} · {section_code} · Due {date}`, and a **Take** button.

**Server rules:** resolves the student from `auth.uid()`. `upcoming_assessments` = enrolled sections × published assessment items still open, excluding any already submitted, ordered by due date, **limit 5**. `pending_grades_count` = released grades with no completed evaluation lock — i.e. *"grades you must evaluate to unlock."*

**`InstitutionalIdentityCard`** — a tabbed panel (Hymn / Vision & Mission / Core Values) added as QA fix F4.

> **Gaps**
> - **The "Take" button is unconditional.** Unlike `SubjectAssessmentList`, which has a full six-state availability gate (§5), the dashboard renders "Take" for every listed assessment. The user only discovers it's blocked when `fn_start_assessment_timer` refuses.
> - `fn_get_student_dashboard` only checks `is_published` — it **ignores `scheduled_publish_at` and `opens_at`**, so assessments that haven't opened yet appear as upcoming with a live Take button.
> - 🟡 **The hymn lyrics and the six core values in `InstitutionalIdentityCard` are unverified.** Vision and mission were confirmed from the official site; the hymn came from search snippets and student-upload sites, and the core values appear only in secondary sources. **This must be verified against official sources before thesis submission** — see [13](13-roadmap-and-status.md).

---

## 3. My Schedule

**Route** `/student/schedule` — a 422-line custom weekly grid.

RPCs: `fn_get_student_schedule` · `fn_list_my_section_colors` · `fn_upsert_student_section_color`.

**Grid geometry:** Monday–Sunday, time slots from **07:00 to 21:30** in 30-minute steps.

**Layout algorithm** (`buildDayLayout`) — a genuine interval-cluster column packer. Entries sort by start ascending then end descending; a cluster flushes when the next entry starts after the cluster ends; within a cluster each entry takes the first column whose previous entry has ended, otherwise a new column opens; blocks are positioned at `left = col/total`, `width = 1/total`. **Overlapping conflict-authorized classes render side by side rather than stacked** — a well-executed piece of work.

**Actions:**
- **Toggle visibility** — a chip row above the grid, one button per section, tinted with the section colour and prefixed with a shield icon when the enrollment is conflict-authorized. Purely client-side.
- **Customize colour** — clicking a block opens a colour picker; saving persists via `fn_upsert_student_section_color` with optimistic local update. Persisted colours merge over an 8-entry fallback palette.
- **Tooltip** — `{course} · {section} · {start} - {end} · {room}`, plus `— Authorized overlap: {reason}` when applicable.
- **Conflict banner** — *"N subjects have an authorized schedule overlap. Overlapping blocks are shown side by side."* Conflict blocks also get a warning outline and an inline shield.

> **Gaps**
> - **Classes outside 07:00–21:30 render off-grid** — a 6 AM class gets a negative `top` offset.
> - **No term filter.** `fn_get_student_schedule` returns every section with an active `Enrolled` enrollment from **all terms**, drawn onto one week. A student with a lingering `Enrolled` record from a previous term sees a corrupted schedule.
> - `faculty_name` is built as `first_name || ' ' || last_name` on a LEFT JOIN with **no `'Unassigned'` coalesce**, so it comes back NULL for unassigned sections — unlike every sibling RPC.
> - `fn_upsert_student_section_color` was QA bug B1: it referenced a partial unique *index* as if it were a table *constraint* in its `ON CONFLICT`.

---

## 4. My Subjects

**Route** `/student/subjects` · **RPC** `fn_list_my_subjects` (paged, searchable, sortable).

Read-only `CommonTableCard`. Columns: course code, course title, section code, term, faculty (`?? '—'`), **Units** (formatted `"{lec} lec / {lab} lab"` when laboratory units exist, else just the lecture figure), and an enrollment-status badge (Enrolled→success, Dropped/Withdrawn/Failed→error, Completed→info, Incomplete→warning).

Row click → subject detail.

---

## 5. Subject Detail

**Route** `/student/subjects/:enrollmentId` — five tabs, **lazily fetched and cached** by a `=== null` sentinel (the only screen in the app that caches tab data).

| Tab | RPC |
|---|---|
| header (on mount) | `fn_get_subject_detail` |
| Assessments | `fn_get_subject_assessments` |
| Grades | `fn_get_subject_grades` |
| Content | shared `SectionContentPanel` → `fn_get_section_content` |
| Discussion | shared `SectionDiscussionPanel` → `fn_list_section_threads_json` |

Content and Discussion render only once `subject?.section_id` has loaded.

### 5a. Assessments tab

Two client-side filters (type, grading period), both derived from the data present.

**`getAssessmentState(item)`** — the availability gate, in strict precedence:

| # | Condition | Result |
|---|---|---|
| 1 | submission is Submitted / Late / Graded | "Submitted", cannot take |
| 2 | `attempts_used >= max_attempts` | "Max attempts reached" |
| 3 | `closes_at < now` | "Closed" |
| 4 | `scheduled_publish_at > now` | "Not yet published" |
| 5 | `opens_at > now` | `"Opens {date}"` |
| 6 | otherwise | **"Take"** — enabled |

Columns: title, type, period, points, opens/due/closes, and an action cell — **View Results** if a submission exists, otherwise a **Take** button labelled with the state.

Row click opens a detail modal with badges, description, a stat grid (Total Points / Passing / Questions / Time Limit / Attempts / Submission), the three timestamps, and **Attachments** as download buttons issuing a signed URL.

**Server visibility rule** (`fn_get_subject_assessments`): `is_published = true OR (scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= now())`. Ordered by grading-period sequence, then opens, then due.

### 5b. Grades tab

Renders per grading period. `isReleased(item) = item.is_visible && item.evaluation_completed`.

Raw / Final / Transmuted show a value **only when released**, otherwise `—`. Transmuted falls back to `special_grade`.

The Status column has three states:
- Released → success badge
- `is_visible && !evaluation_completed` → an orange **"Evaluate to view"** button linking directly to the evaluation for that period
- otherwise → "Not yet released"

Empty state: *"No grades to show yet — Grades appear here once your instructor has set up grading periods for this section and released them."* (a QA fix — it previously showed a bare AG-Grid overlay).

`fn_get_subject_grades` enumerates **all** grading periods of the term via LEFT JOIN, so ungraded periods appear as null rows rather than vanishing.

> **Gaps** There is **no refetch or cache invalidation after taking an assessment** — the lazy-tab cache means a student returning from a submission sees stale assessment state until a full reload.

---

## 6. ⭐ Taking an assessment

**Route** `/student/subjects/:enrollmentId/assessments/:assessmentId`

This is the most complex student flow and the one with the most severe defects. Read §6.5 before relying on it in a demo.

### 6.1 RPC map

| Step | RPC |
|---|---|
| Load metadata | `fn_get_assessment_for_student` |
| Start attempt | `fn_start_assessment_timer` |
| Load questions | `fn_get_assessment_questions_for_student` |
| Autosave one answer | `fn_save_student_answer` |
| Upload a file | *(no RPC)* `supabase.storage.from('submissions').upload(...)` |
| Persist file list | `fn_save_student_answer_files` — **`{ silent: true }`** |
| Heartbeat, every 30 s | `fn_record_heartbeat` |
| Submit | `fn_submit_assessment` |

Upload path: `{submissionId}/{questionId}/{timestamp}_{filename}`, `upsert: false`.

### 6.2 Client flow

1. **Mount** → load metadata. Until it resolves the page shows "Loading...".
2. **Pre-start splash** — title, description, a stat row (Total Points, Time Limit, Max Attempts, Due), and a **Start Assessment** button.
3. **`handleStart()`** → `fn_start_assessment_timer` → store `submissionId` and `expiresAt` → fetch questions → build RHF defaults from `saved_answer` → start a 30-second heartbeat interval.
4. **Paging** — `questionsPerPage = show_all_questions ? all : (questions_per_page ?? all)`. **Previous and Next each await a `Promise.all` of every visible answer save**, so a page turn is a save point. Submit appears when showing all questions or on the last page.
5. **`handleSaveAnswer`** — no-ops without a submission; **returns early for File Upload questions**; choice-based types send `choice_id`, everything else sends `answer_text`.
6. **`handleSubmit()`** — saves *every* question (not just the visible page), then calls `fn_submit_assessment`, clears the heartbeat, and navigates to the **subject page** (not the result page).

### 6.3 The timer

`AssessmentTimer` runs a 1-second interval computing `expiresAt - Date.now()`, formats `MM:SS`, turns error-coloured under 5 minutes, and at zero calls `onExpire()` — which is `handleSubmit`.

It uses the **client clock** against a server-issued expiry.

### 6.4 Question rendering

| Type group | Control |
|---|---|
| Multiple Choice, True or False, Matching | a **single-select dropdown** over `choices` |
| Short Answer, Essay, Fill in the Blank | a text input (multiline for Essay) |
| File Upload | `FileUploadAnswer` |
| anything else | **no input at all** |

`FileUploadAnswer` validates count, extension (case-insensitive suffix match; an empty allow-list means any type), and size, surfacing each failure in a red line. Then it uploads sequentially and persists the list.

### 6.5 🔴 Critical defects in this flow

These four compound into a genuinely broken experience, and they are the highest-priority functional bugs in the system.

**1. There is no attempt resume.**
`handleStart` unconditionally calls `fn_start_assessment_timer`, which **always INSERTs a new submission and increments the attempt counter**. The client never looks for an existing `In Progress` submission. Therefore:
- A page refresh, an accidental back-navigation, or a dropped connection **burns an attempt**
- With the default `max_attempts = 1`, a single refresh **permanently locks the student out**
- The `saved_answer` prefill logic in `handleStart` is consequently **dead code in practice** — a freshly created submission has no saved answers to restore

**2. Timer auto-submit is a dead end.**
`onExpire` fires exactly at `expiresAt` and calls `handleSubmit`, which first awaits a `Promise.all` of every answer save — and only *then* calls `fn_submit_assessment`. By that point `now() > time_limit_expires_at`, and the RPC refuses with *"Submission window has expired."* **The submission is left `In Progress` forever.**

**3. The server-side expiry sweep never runs.**
`fn_expire_overdue_submissions` would rescue case 2 by force-submitting overdue attempts. But it keys off `assessment_timer_sessions.server_expires_at`, while `fn_start_assessment_timer` writes **`expires_at`** and never populates `server_expires_at`. Its only caller is `fn_record_heartbeat`, which reads the same unset column. And **the only `cron.schedule` in the repository is `grade-release-sweep`** — this sweep is not scheduled at all. It is effectively dead code guarding against exactly the failure mode in defect 2.

**4. Heartbeat responses are discarded.**
The client `await`s `recordHeartbeat(subId)` with no result handling. A rejected or expired session produces **no UI signal whatsoever**.

### 6.6 Server rules

**`fn_start_assessment_timer`** — ordered gates: assessment exists and is published (accepting the `scheduled_publish_at <= now()` fallback) → not before `opens_at` → not after `closes_at` → enrollment matches the section and is `Enrolled` → attempts remaining. Then inserts a submission (`status='In Progress'`) **and** a timer session (`status='Active'`).

**`fn_save_student_answer`** — authorizes through `submissions ⋈ enrollments ⋈ students.user_id = auth.uid()` **and** requires `status IN ('In Progress','Not Started')`. If a `choice_id` is supplied it **auto-grades on the spot**, setting `points_earned` to the question's full points when correct, 0 when incorrect. Upserts on `(submission_id, question_id)`.

**`fn_save_student_answer_files`** — same gate, plus a check that the question belongs to the submission's assessment. **Nulls out `answer_text` and `choice_id`** on conflict.

**`fn_get_assessment_questions_for_student`** — returns choices **without `is_correct`**, so the answer key never reaches the client. Shuffling uses `ORDER BY CASE WHEN shuffle THEN random() ELSE sequence END`.

**`fn_submit_assessment`** — requires a submittable status; **refuses when `now() > time_limit_expires_at`**; computes `is_late = now() > due_at`; sets status to `Late` or `Submitted`, and marks the timer session `Submitted`.

> **Further gaps in this flow**
> - **`fn_get_assessment_questions_for_student` requires `is_published = true` and does *not* honour the `scheduled_publish_at` fallback**, while `fn_start_assessment_timer` and `fn_get_assessment_for_student` both do. A scheduled-publish assessment can therefore be **started** and then returns *"Access denied."* on the question fetch — a dead-end mid-flow.
> - **Shuffle is re-randomised on every call**, not seeded per submission. Any refetch reorders the questions under the student, and the page slicing shifts with it.
> - **`Matching` renders as a single-select dropdown**, which cannot express a matching answer. The type is authorable and unusable.
> - **Unknown question types render no input control at all.**
> - **A mid-batch file upload failure orphans already-uploaded storage objects** — they were uploaded but `persist()` is never called. Removing a file deletes only the DB reference; **the storage object is never deleted**.
> - **`fn_save_student_answer_files` is `{ silent: true }`** — file-persistence failures are invisible.
> - **No error state on the page** — if metadata loading fails, it shows "Loading..." forever.
> - On successful submit the app navigates to the subject page, **not** the result page.

---

## 7. Assessment Result

**Route** `.../assessments/:assessmentId/result` · **RPC** `fn_get_my_assessment_result`

Header badges: type, status, a client-computed Passed/Failed, and "Late" when applicable. A four-item detail grid (Score, Passing, Attempt, Submitted). An Instructor Feedback block. A pending banner when results aren't yet available, reading either *"Results will be available on {date}."* or *"Your submission is awaiting grading."*

`RubricBreakdown` renders when a rubric is attached — per criterion, title, description, `{earned} / {max} pts`, and criterion feedback.

`ResultAnswerCard` per answer. For choice-based questions **every** choice renders as a bordered row with colour precedence: correct (success) > wrong-and-selected (error) > selected (primary) > default, with check/cross markers **only when results are available**. Otherwise it shows the answer text, or file attachments as signed-URL buttons, or "No answer provided".

### The security design worth noting

```
v_results_available := status IN ('Graded','Returned')
                       AND (show_results_at IS NULL OR show_results_at <= now())
```

**Every score-bearing field is `CASE WHEN v_results_available THEN … ELSE NULL END`** — `raw_score`, `final_score`, `feedback`, per-answer `points_earned`, `is_correct`, `grader_notes`, `explanation`, and crucially **`choices[].is_correct`**.

The answer key is **withheld server-side, not merely hidden in the UI**. A student inspecting the network response before results are released sees nulls. This is a genuinely correct implementation of a control that is very commonly got wrong, and it is worth putting on a slide.

Note the release gate here is the **assessment-level `show_results_at`**, entirely independent of the registrar's grading-period grade release.

Unanswered questions still appear in the list, with nulls.

---

## 8. My Grades

**Route** `/student/grade` · **RPC** `fn_list_my_grades` (`p_page`, `p_size`, `p_sort`, `p_term_id`)

A term filter strip above the table, auto-selecting the first option. `fetchGrades` injects a synthetic `row_id = "{enrollment_id}:{grading_period_id}"` because neither field alone is unique.

Columns: course code, title, section, faculty, grading period, Raw, Final, Transmuted, Evaluation.

`formatGrade` renders **`'Locked'`** when the evaluation isn't complete, otherwise the value, otherwise `—` (Transmuted falling back to `special_grade`).

The Evaluation cell is either plain text "Completed" or an orange **Evaluate** button linking to that exact enrollment + period.

Subheader: *"Released grades. Complete the faculty evaluation to unlock a locked row."*

### The gate, precisely

`fn_list_my_grades` guards `fn_assert_role('Student')`, resolves the caller's own student id, and fixes the WHERE clause to `student_id = <self> AND sfg.status = 'Released'`. **Grades that are not Released never appear at all.** For rows that do appear, every grade column is `CASE WHEN evaluation_lock.is_completed THEN value END` — **NULLed server-side**, not hidden client-side.

Default order puts unevaluated rows first.

```
Registrar releases
   → row appears with all numbers Locked / NULL
   → student submits the faculty evaluation
   → fn_submit_evaluation writes the lock and calls fn_release_grades_after_evaluation
   → enrollments.is_grade_visible = true
   → numbers appear
```

> **Gaps** The table shell accepts a search term and **discards it** (`_search` is unused; the RPC has no `p_search`). The search box is inert.

---

## 9. Faculty Evaluation

**Route** `/student/evaluations/:enrollmentId?/:gradingPeriodId?` — both params optional.

| Purpose | RPC |
|---|---|
| Target dropdown | `fn_list_my_evaluations_json` |
| Load form | `fn_get_evaluation_form` |
| Submit | `fn_submit_evaluation` |

**Screen:** a header card showing `"{pendingCount} faculty still awaiting your evaluation."`; a faculty select whose values are `"{enrollmentId}|{gradingPeriodId}"`; a context line; and a **Rating Legend** card rendered only when every Rating question uses exactly the 1–5 scale (*"5 = Strongly Agree … 1 = Strongly Disagree"*).

**Sectioned, paginated form.** Template sections are flattened into one `useFieldArray`, then re-bucketed per page into a rating matrix and open-ended rows. A section continued across a page break gets **"(continued)"** appended and its description suppressed.

`EvaluationRatingMatrix` is a table whose columns are the **union** of all question scales rendered high→low (5 4 3 2 1), rows are questions, cells are radios. **Cells outside a given question's own min/max render as empty `<td>`s**, so mixed scales are genuinely supported in one matrix — a nice piece of work.

**Submit:** `flagMissingAnswers` sets an RHF error on **every** missing field, then `goToIndex(firstMissingIndex)` **jumps the pagination to the offending page** and toasts a warning — no RPC is called. This is a good answer to the SF5 "errors on inactive pages are invisible" problem, implemented here and nowhere else.

**Read-only mode:** once `is_completed`, every control is disabled and the submit button is hidden entirely.

### Evaluation scope

An enum `('Period','Term')`, with a system-wide default in `system_settings` and a per-term override on `terms.evaluation_scope`.

- `fn_get_evaluation_scope(term)` = `COALESCE(term override, system default, 'Period')`
- `fn_resolve_evaluation_period(enrollment, gp)` maps any grading period to an **anchor** period when scope is `Term`, so **one evaluation unlocks every period of that term**; identity when scope is `Period`.

Under Term scope the period name is literally rendered as `'Whole Term'`.

### Server rules

- **`fn_list_my_evaluations_json`** — the target set derives from **`section_final_grades` with `status='Released'`**. An evaluation target only appears **once a grade has actually been released for it**. This is the other half of the gate: you cannot pre-emptively evaluate.
- **`fn_get_evaluation_form`** — ownership-checked; builds sections from `fn_list_applicable_evaluation_templates(student)` (program-scoped, active, ordered); returns a soft error if there are zero applicable templates; loads prior answers.
- **`fn_submit_evaluation`** —
  1. Ownership check
  2. **Idempotency lock** — if already completed, *"You have already completed this evaluation."* **The evaluation is one-shot and cannot be amended.**
  3. **Server-side completeness check** mirroring the client's
  4. Upserts the `evaluation_period_locks` row
  5. **Soft-deletes all prior responses** then re-inserts (unknown question ids silently dropped)
  6. Calls `fn_release_grades_after_evaluation`
- A trigger `fn_auto_complete_evaluation_lock()` fires off `evaluation_responses` and closes the lock as soon as completion passes — so the lock closes even for a response written outside the submit RPC.

> **Gaps**
> - **Divergent completeness semantics.** `fn_check_evaluation_completion` (used by grade release) counts required questions against the lock's **single `template_id`**, while `fn_submit_evaluation` validates against the full **`template_ids[]`** array. With multi-section forms the completion check that gates grades is **weaker** than the submit check.
> - **The evaluation is one-shot with no amend or reopen path** anywhere in the UI or the RPCs. A mis-click on a rating is permanent.
> - `useEvaluationTargets` hardcodes `p_size = 200` with no pagination, and always passes `''` for both `p_search` and `p_status` — so the RPC's search and status filtering are **unreachable**.
> - Three different SQL files define `fn_get_evaluation_form` / `fn_submit_evaluation`. Only `evaluation-scope.sql` matches what the TypeScript expects; an older version in `evaluation-sections.sql` **hard-refuses** a completed evaluation rather than returning it read-only. Which is live is unverifiable from the repo.

---

## 10. Curriculum

**Route** `/student/curriculum` — a 42-line tab shell over two shared components, both called **with no `studentId`** so the RPCs resolve the caller's own record via `fn_resolve_record_student(NULL)`.

| Tab | Component | RPC |
|---|---|---|
| Checklist | `CurriculumAuditView` | `fn_get_curriculum_audit` |
| Grade Report | `TranscriptView` | `fn_get_student_transcript` |

Both offer `window.print()`.

`CurriculumAuditView` renders summary tiles and a progress bar, then per-year blocks broken into per-term-type tables: Code / Course Title / Units / Term Taken / Grade / Status (Completed→success, Failed→error, In Progress→warning, Not Taken→info). Grade falls back to `special_grade`.

For the student, the transcript is the **unofficial** variant with the "Request an official transcript from the Registrar" disclaimer — the same component the registrar sees as official, differentiated entirely by the server-set `is_official` flag.

---

## 11. Insight

**Route** `/student/insight` — a **9-line** page wrapping `<StudentInsightView />` with no props. **RPC** `fn_get_student_insight(null, null)`.

`StudentInsightView` renders stat tiles, a GWA trend chart, a mastery bar list, risk badges (High→error / Moderate→warning / Low→success), a per-course table (average score, attendance rate, missing count), and **`TrajectoryCard`s** for each honour and scholarship target.

Each trajectory card shows the label, target GWA, an optional tuition discount, and one of four states:

| State | Message |
|---|---|
| `is_blocked_by_failing` | "Blocked: a failing grade on record disqualifies this award." |
| `is_currently_qualified` | "On track" |
| `required_avg_on_remaining !== null` | "You need to average X across your remaining units…" |
| otherwise | "Not enough released grades yet to project this target." |

Status badge: On track / Out of reach / Reachable.

**This is the student-facing half of the thesis centerpiece.** Full detail in [12 — Analytics & AI](12-analytics-and-ai.md).

> **Gaps** Neither this page nor the registrar's Insight tab ever passes a `termId`, so **`fn_get_student_insight`'s `p_term_id` parameter is dead from the UI** — there is no way to view a past term's insight. `StudentDashboard` checks `result.data?.success` before using the payload; `StudentInsightView` does not.

---

## 12. Student gaps summary

| # | Gap | Impact |
|---|---|---|
| 1 | **No attempt resume — a refresh burns an attempt and locks the student out at `max_attempts = 1`** | 🔴 The single worst bug in the system |
| 2 | **Timer auto-submit is refused by the server; the submission is stranded `In Progress` forever** | 🔴 Data loss on every timed assessment that runs out |
| 3 | **`fn_expire_overdue_submissions` reads a column nobody writes and is scheduled by no cron** | 🔴 The safety net for #2 does not exist |
| 4 | **Scheduled-publish assessments can be started but return "Access denied." on the question fetch** | 🔴 Mid-flow dead end |
| 5 | **Heartbeat responses discarded — an expired session gives no signal** | 🔴 |
| 6 | **`Matching` renders as a single-select and cannot express a matching answer** | 🟠 Unusable question type |
| 7 | **Unknown question types render no input** | 🟠 Silent blank |
| 8 | **Failed file uploads orphan storage objects; removal never deletes them** | 🟠 Storage leak |
| 9 | **File persistence is silent — failures invisible** | 🟠 |
| 10 | **Question shuffle re-randomises on every fetch, not per submission** | 🟠 Order shifts under the student |
| 11 | **Dashboard "Take" buttons have no availability gating** | 🟠 |
| 12 | **Evaluation is one-shot with no amend path** | 🟠 |
| 13 | **Completion check (gating grades) is weaker than the submit check** on multi-section forms | 🟠 |
| 14 | **Schedule ignores term** — all-time enrolled sections on one week | 🟠 |
| 15 | **No error state on the take-assessment page** — "Loading..." forever | 🟠 |
| 16 | Schedule grid hard-bounded to 07:00–21:30 | 🟡 |
| 17 | Grades search box is inert | 🟡 |
| 18 | No cache invalidation after submitting an assessment | 🟡 |
| 19 | Submit navigates to the subject page, not the result page | 🟡 |
| 20 | `p_term_id` on student insight unreachable from the UI | 🟡 |
| 21 | Evaluation target list capped at 200 with no pagination | 🟡 |
| 22 | 🟡 **Hymn lyrics and core values unverified** — must be confirmed before submission | 🟡 |
| 23 | "Subject" nav de-highlights on all sub-routes; `'Dean'` name fallback | ⚪ |
