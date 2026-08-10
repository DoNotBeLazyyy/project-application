# Arellano University LMS — System Flow & Test Guide

This document describes the end-to-end flow of the system across every role and gives a
concrete, ordered test script your teammates can follow. It reflects the state of the
`develop_auth` branch after the verification pass described at the bottom.

> **Architecture reminder (why testing looks the way it does):** the frontend is a thin
> presentation layer. All business logic lives in PostgreSQL functions (`fn_*`) called via
> `supabase.rpc()`. When a screen shows data or blocks an action, the rule that produced it
> lives in the database, not the UI. See `CLAUDE.md` §1 and §11.

---

## 0. Roles at a glance

The system enforces **single responsibility** — one role, one area. A person who needs more
than one capability is granted multiple roles and switches between them with the **Role
Switcher** in the sidebar.

| Role | Owns | Route prefix |
|---|---|---|
| **Admin** | Users, roles, school years, terms, grading config, system settings | `/admin` |
| **Dean** | Departments, programs, courses, curriculum maps, sections, faculty assignment | `/dean` |
| **Registrar** | Students, enrollments, grade release | `/registrar` |
| **Faculty** | Assigned sections: attendance, grading, assessments | `/faculty` |
| **Student** | Schedule, subjects, taking assessments, grades | `/student` |

---

## 1. Authentication & onboarding (all roles)

1. Admin provisions a user (see §2). Supabase sends an **invite email**.
2. The invited user opens the link → lands on `/set-password`.
3. `AuthGuard` traps any user whose profile `status = 'Invited'` on `/set-password` until they
   set a password (the onboarding gate).
4. After setting a password, `status` becomes `Active` and the user is routed to their active
   role's home (`RoleRedirect`).
5. **Role switching:** if the user holds multiple roles, the sidebar shows a role `CommonSelect`.
   Switching updates `activeRole` in the store and re-scopes navigation and guards.

**Test:** invite a user, set the password, confirm you land on the correct role home; for a
multi-role user, switch roles and confirm the sidebar + accessible routes change.

---

## 2. Admin flow (`/admin`)

Pages: **Dashboard**, **Users** (`/admin/users`), **School Years** (`/admin/school-years`),
**Terms** (`/admin/terms`), **Term Types** (`/admin/term-types`), **Roles** (`/admin/roles`),
**Grading Configuration** (`/admin/grade-configurations`), **System Settings**.

Key flows to test:

1. **User provisioning** — create a single user (assign one or more roles), confirm invite is
   sent and the row shows an *Invited* state with a **Resend Invite** action.
2. **Bulk user provisioning** — download the CSV template, upload a filled CSV, confirm rows are
   created transactionally.
3. **Bulk delete** — select multiple rows via the table checkboxes and delete; confirm soft delete.
4. **School years & terms** — create a school year, then terms under it, and term types. These are
   the calendar backbone every other role depends on.
5. **Grading configuration** (`/admin/grade-configurations`) has three tabs:
   - **Grading Periods** — global templates (e.g. Prelim/Midterm/Finals). Weights **must total
     100%**; the UI blocks adding a period once the total reaches 100% and each period's
     components are validated. Add / view / edit / delete a period.
   - **Transmutation Table** — enter the *minimum %* per grade; the max is auto-derived so ranges
     never overlap or gap. Save and confirm validation on out-of-order rows.
   - **Special Grades** — configure INC/DRP-style codes.

**Cross-role dependency:** grading periods + transmutation table defined here are what Faculty
grade against and what Students eventually see.

---

## 3. Dean flow (`/dean`)

Pages: **Dashboard**, **Program Levels**, **Course Types**, **Departments**, **Programs**,
**Courses**, **Curriculum Maps**, **Sections**.

Recommended order (each step depends on the previous):

1. **Program Levels** and **Course Types** — reference data.
2. **Departments** — create a department; optionally assign a department head.
3. **Programs** — create a program under a department.
4. **Courses** (`/dean/course-management`) — create a course. Test the **Prerequisites** editor
   specifically (see the fixed-input note in §7):
   - Add prerequisite rows; each row's **Kind** (Course / Standing), **Course/Year Level**,
     **Type** (Required / Co-requisite / Recommended), and **Min Grade** are dependent selects.
   - Changing **Kind** resets the dependent fields; **Min Grade** locks for Co-requisite/Standing;
     already-selected courses are excluded from other rows' options.
   - Split courses (LEC/LAB) expose laboratory units.
5. **Curriculum Maps** (`/dean/curriculum-map-management`) — pick a program (and optionally a
   school year), then add course entries per year level / term. Entries can be **created, viewed,
   edited (via the View modal's "Edit" button), and deleted**, plus **bulk import via CSV** and
   **print**.
6. **Sections** — create sections for courses and **assign faculty** to them. This is the handoff
   point to the Faculty role.

**Cross-role dependency:** sections + faculty assignment created here are what appear in the
Faculty role's "My Sections", and what Registrar enrolls students into.

---

## 4. Registrar flow (`/registrar`)

Pages: **Dashboard**, **Students** (`/registrar/student-management`), **Enrollments**
(`/registrar/enrollment-management`), **Grade Release** (`/registrar/grade-release`).

Key flows:

1. **Students** — manage the official student roster (single + bulk CSV).
2. **Enrollments** — enroll students into sections. This is what makes a subject appear in the
   Student role's "My Subjects" and populates a section's roster for Faculty.
3. **Grade Release** — release final grades per grading period once Faculty has submitted them.
   Released + evaluation-complete grades become visible to Students.

**Cross-role dependency:** enrollment here → Student sees the subject; grade release here →
Student can view the grade (subject to the evaluation gate, see §6).

---

## 5. Faculty flow (`/faculty`)

Pages: **Dashboard**, **My Sections** (`/faculty/sections`), **Section Detail**
(`/faculty/sections/:sectionId`).

Section Detail has four tabs — **Students, Attendance, Grading, Assessments**. The active tab is
stored in the URL (`?tab=`), so a refresh keeps you on the same tab (see §7).

### 5a. Assessments (the primary flow to test)

From the **Assessments** tab:

1. **Create / Build** (`New Assessment` → Assessment Builder):
   - **Settings** (left): title, type, grading component, total/passing points, time limit,
     max attempts, shuffle options, show-all-vs-paged questions, and the scheduling fields:
     **Scheduled Publish**, **Opens At**, **Due At**, **Closes At**, **Show Results At**.
     Required fields are validated on submit.
   - **Questions** (right): add questions of each type (Multiple Choice, True/False, Short Answer,
     Essay, Fill in the Blank, Matching, File Upload), with points, choices, and correct answers.
   - Attachments can be uploaded to the assessment.
2. **Publish / Unpublish** — from the Assessments tab list (eye icon). Only published + open
   assessments are takeable by students.
3. **Submissions** (`.../submissions`) — after students submit, grade each submission answer,
   leave feedback, and save. The **Back** button returns you to the Assessments tab.

The scheduling fields drive the **Student** side gating (see §6): `scheduled_publish_at`,
`opens_at`, and `closes_at` determine whether a student sees "Not yet published", "Opens …",
"Closed", or a live **Take** button.

**Test the full loop:** build an assessment with an `Opens At` in the future → confirm the student
sees "Opens …" and cannot take it; change `Opens At` to now → student can take it; after the
student submits, grade it here and confirm the score/feedback flow back.

### 5b. Attendance & Grading

- **Attendance** — create sessions and mark records.
- **Grading** — grade against the grading components/periods defined by Admin; the grade sheet
  computes from the DB.

---

## 6. Student flow (`/student`)

Pages: **Dashboard**, **Schedule** (`/student/schedule`), **My Subjects** (`/student/subjects`),
**Subject Detail** (`/student/subjects/:enrollmentId`), **Take Assessment**
(`.../assessments/:assessmentId`), **Grades** (`/student/grade`).

1. **Dashboard** — three stat cards (enrolled subjects, upcoming assessments, grades to view) and
   an **Upcoming Assessments** list with a **Take** shortcut per item.
2. **Schedule** — weekly grid of enrolled sections; click a subject block to customize its color
   (persisted per student).
3. **My Subjects** — list of enrolled subjects; click a row → Subject Detail.
4. **Subject Detail** — two tabs:
   - **Assessments** — each assessment shows type, points, attempts, open/due/close times,
     downloadable attachments, and a **Take** button that is enabled/disabled based on the
     gating rules (submitted, max attempts reached, closed, not yet published, or "Opens …").
   - **Grades** — per grading period. A grade is only revealed when it is **released** *and* the
     **faculty evaluation for that period is complete**. Otherwise it shows "Not yet released" or
     "Complete evaluation to view grade".
5. **Take Assessment** — intro screen (points / time limit / attempts / due) → **Start** →
   questions (all-at-once or paged), autosave per answer, live **timer** with heartbeat, and
   **Submit**. On submit you return to the subject.
6. **Grades page** (`/student/grade`) — filter by term; released grades listed with raw / final /
   transmuted values.

### End-to-end chain (the "everything is connected" path)

```
Admin        Dean                       Registrar        Faculty                    Student
─────        ────                       ─────────        ───────                    ───────
users    →   course + section +     →   enroll       →   build + publish        →   see subject,
roles,       faculty assignment         student in       assessment (opens/         take assessment,
terms,       curriculum map             section          scheduled publish)         submit
grading                                                  │                          │
config   ───────────────────────────────────────────────┤ grade submission         │
                                        release grade  ←─┘ + grading periods        │
                                        after eval    ──────────────────────────→   view grade
```

---

## 7. Notable UX behaviors (recently fixed — worth confirming)

1. **Section/Subject tabs survive refresh.** Faculty Section Detail and Student Subject Detail
   store the active tab in the URL (`?tab=`). Refreshing on Attendance/Grading/Assessments (or
   Student Grades) keeps you there instead of snapping back to the first tab.
2. **Assessment Builder / Submissions "Back" returns to the Assessments tab**, not the Students
   tab.
3. **AG-Grid-style form tables no longer blur while typing.** Editable table rows (e.g. Course
   **Prerequisites**, Admin **Transmutation** and **Grading Period** editors) bind each cell
   directly to the form, so typing does not lose focus, you can **Tab** from one input to the
   next, and **required fields enforce their rules** on submit.

---

## 8. Known gap (not a regression)

- **Student faculty evaluation is not yet implemented.** On Subject Detail → Grades, a period that
  is released but not yet evaluated shows an **"Evaluate"** button that is currently a no-op. The
  database has *status/lock* functions (`fn_get_student_evaluation_status`,
  `fn_check_evaluation_completion`) but **no question-fetch / response-submit RPCs and no student
  evaluation page/route**. Completing this needs new DB RPCs plus a new page — track it as a
  separate feature. Until then, grade release that depends on evaluation completion cannot be
  exercised from the student UI.

---

## 9. How to verify the build (no test runner in this repo)

This project has **no unit-test runner** — verification is by typecheck + build + lint + driving
the flows above.

```bash
npm run build-dev   # tsc -b (typecheck) + vite build — must succeed
npm run lint        # must report 0 errors
npm run dev         # run locally and walk the flows in §2–§6
```

**Current status on `develop_auth`:** `npm run build-dev` succeeds, `npm run lint` reports
**0 errors, 0 warnings**.

> **Schema snapshot note:** `supabase_ai_context.sql` is a *generated* dump kept as a structural
> reference. It is **intentionally frozen and never regenerated**, so it lags the live DB (it
> predates the grading-period, admin-dashboard, and department-head work). RPCs the frontend calls
> are absent from the snapshot yet live in the database — `fn_get_admin_dashboard_stats`,
> `fn_get_faculty_dean_users`, `fn_create/update/delete_grading_period_template` among them.
> **`docs/sql/*.sql` is the source of truth**: every schema change is authored there and applied
> manually. Check `docs/sql/` first for anything added or changed since the snapshot, and treat the
> dump as a baseline for tables, columns, and enums only.
