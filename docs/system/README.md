# AU-JAS LMS — Complete System Reference

**Arellano University (Jose Abad Santos campus) Learning Management System.**
A React 18 + Vite + TypeScript frontend over a Supabase/PostgreSQL backend, built on a strict *thick database, thin client* paradigm. Five roles, ~60 page routes, 42 service modules, ~200 PostgreSQL RPCs, ~55 tables, 47 applied SQL scripts.

This is the reference for the whole system as it exists **today** — what is built, what is half-built, what was planned and never executed, and what was deliberately rejected.

> **Status legend used throughout:** ✅ Built · 🟡 Partial / needs verification · ⬜ Planned, not executed · ❌ Rejected

---

## 🧭 Where to start

Pick the path that matches why you're reading.

### Path A — "I want to review the whole system tonight" (read in this order)

| # | Read | Why | Est. |
|---|---|---|---|
| 1 | **This page** — the map + glossary | Orientation and vocabulary | 5 min |
| 2 | [13 — Roadmap & Status](13-roadmap-and-status.md) | **Start here if you only read two chapters.** What was planned vs what actually shipped. This is the "set my goal straight" chapter. | 20 min |
| 3 | [14 — Pros, Cons & Recommendations](14-assessment-pros-cons.md) | Thesis-defense readiness and engineering health, separated. Prioritised. | 20 min |
| 4 | [01 — Architecture](01-architecture.md) | How everything is wired; the patterns every chapter refers back to | 15 min |
| 5 | [02 — Auth & RBAC](02-auth-and-rbac.md) | **Contains the single most serious finding in the system.** Read before the role chapters. | 15 min |
| 6 | [04](04-role-admin.md) → [08](08-role-student.md) — the five role chapters | The actual feature inventory, screen by screen | 60 min |
| 7 | [10](10-assessment-engine.md) + [11](11-grading-engine.md) — the two engines | The most intricate subsystems, spanning roles | 30 min |
| 8 | [12 — Analytics & AI](12-analytics-and-ai.md) | Your thesis centerpiece | 15 min |
| 9 | [03](03-data-model.md) + [09](09-shared-features.md) | Reference material — skim now, return when needed | 15 min |

### Path B — "I need to decide what to build next"
[13 — Roadmap & Status](13-roadmap-and-status.md) → [14 — Pros & Cons](14-assessment-pros-cons.md) → then the specific role chapter for whatever you pick.

### Path C — "I'm preparing the thesis defense"
[12 — Analytics & AI](12-analytics-and-ai.md) → [14 §A — Defense readiness](14-assessment-pros-cons.md) → [02 — Auth & RBAC](02-auth-and-rbac.md) (the security narrative is a defensible contribution, *and* a liability — both live here).

### Path D — "Someone new is joining the project"
[01 — Architecture](01-architecture.md) → [03 — Data Model](03-data-model.md) → [02 — Auth & RBAC](02-auth-and-rbac.md) → one role chapter as a worked example.

---

## 📚 Full table of contents

### Foundations — read before the role chapters

| Chapter | Covers |
|---|---|
| [01 — Architecture](01-architecture.md) | Thick-DB paradigm · the four service wrappers · toast/loading/403 behaviour · routing tree · Zustand stores · `CommonTableCard` and `EntityFormPage` patterns · component library · build, env, lint · consolidated architectural gaps |
| [02 — Auth & RBAC](02-auth-and-rbac.md) | Login, invite, set-password, the `Invited` gate · session persistence and idle timeout · role switching · the active-role contract · DB-side guards (`fn_assert_role`, `fn_assert_section_staff`) · RLS coverage · **residual security risks** |
| [03 — Data Model](03-data-model.md) | ~55 tables by owning role · 20 enums · audit columns and soft deletes · RPC naming conventions · the pagination DTO contract · inventory of all 47 SQL scripts · the stale-dump trap |

### The five roles — the feature inventory

Each chapter documents every screen with the same template: **Route · Page file · What it does · Actions available · RPCs called · Business rules · Gaps**.

| Chapter | Responsibility boundary | Screens |
|---|---|---|
| [04 — Admin](04-role-admin.md) | System & infrastructure | Dashboard, users, roles, school years, terms + types, grading config, evaluations, academic thresholds, audit logs, system settings |
| [05 — Dean](05-role-dean.md) | Academic architecture | Dashboard, departments, programs + levels, courses + types, curriculum maps, sections, faculty load & conflicts |
| [06 — Registrar](06-role-registrar.md) | Students & records | Dashboard, student registry, student records, enrollment workspace, batch progression, grade release |
| [07 — Faculty](07-role-faculty.md) | Instruction | Dashboard, sections list, and all **8 tabs** of the section detail page, assessment builder, submissions grading, item analysis, rubric builder |
| [08 — Student](08-role-student.md) | Learning | Dashboard, schedule, subjects, taking assessments, results, grades, evaluations, curriculum audit, personal insight |

### Cross-cutting subsystems

| Chapter | Covers |
|---|---|
| [09 — Shared Features](09-shared-features.md) | Announcements and the audience-resolution core · events · notifications · profile · discussion · storage buckets · i18n (and why there isn't any) |
| [10 — Assessment Engine](10-assessment-engine.md) | Question model · schedule-window semantics · timer sessions & heartbeats · submission state machine · autograding vs manual · rubrics · item analysis · bulk import · duplicate-to-sections |
| [11 — Grading Engine](11-grading-engine.md) | Grading periods & components · the weight invariant · schema inheritance and the grading lock · transmutation ladder · special grades · grade sheet · GWA & academic standing · the release workflow · audit logs |
| [12 — Analytics & AI](12-analytics-and-ai.md) | The learning-analytics engine (the thesis centerpiece) · at-risk scoring · competency mastery · the Gemini Edge Function advisor and its read-only security argument |

### Assessment of the system

| Chapter | Covers |
|---|---|
| [13 — Roadmap & Status](13-roadmap-and-status.md) | Every plan ever written for this project, phase by phase, with a **Done / Partial / Never executed** verdict backed by evidence. Includes both QA remediation rounds, the outstanding silent-failure items, and the orphan plans from a different project sitting in `docs/plans/`. |
| [14 — Pros, Cons & Recommendations](14-assessment-pros-cons.md) | **§A Thesis defense readiness** — the defensible contribution, the questions a panel will ask, the honest answers, a pre-submission checklist. **§B Engineering health** — strengths and liabilities with impact, effort, and a recommendation for each. |

---

## 🏛 The system in one page

### Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite + TypeScript (strict) |
| UI components | MUI v7, theme-driven |
| Layout & typography | Tailwind CSS v4 (plain HTML tags — no `Box`/`Typography`/`Grid`) |
| State | Zustand v5, `persist` for session + active role |
| Backend | Supabase — PostgreSQL, Auth, RPC, Storage, Edge Functions |
| Forms | `react-hook-form` via `ValidCommon*` wrappers |
| Tables | AG Grid Community |
| Icons | `@phosphor-icons/react` |
| Routing | `react-router-dom` v7 |
| AI | Google Gemini Flash, called only from a Supabase Edge Function |

### The paradigm in one paragraph

The frontend renders; PostgreSQL decides. Every operation beyond a trivial read is a `fn_*` PostgreSQL function invoked through `supabase.rpc()`. All Supabase access is confined to `src/services/`, and every service call goes through one wrapper (`callRpc`) that owns the global loading spinner, converts `{success, message}` payloads into toasts, and distinguishes a business `403` from an expired session. Authorization is enforced inside the database functions, not in the router — the React route guards are UX, not security.

### The five roles

Roles are **single-responsibility and non-overlapping**. A person needing two capabilities holds two roles and switches between them with the sidebar role switcher.

| Role | Owns | Cannot touch |
|---|---|---|
| **Admin** | Users, roles, school years, terms, system settings, grading policy, evaluation templates, thresholds, audit logs | Academic curriculum, student records |
| **Dean** | Departments, programs, courses, curriculum maps, sections, faculty assignment | Users, student records, grades |
| **Registrar** | Enrollment, student registry, records, batch progression, grade release | Curriculum design, instruction |
| **Faculty** | Assigned sections: attendance, grading, assessments, content, discussion | Section creation, enrollment, other faculty's sections |
| **Student** | Own schedule, subjects, submissions, grades, evaluations, insight | Everything else |

---

## 📊 Feature status at a glance

Every capability, by role. Detail and evidence in the linked chapters.

### Admin — [chapter 04](04-role-admin.md)

| Capability | Status | Note |
|---|---|---|
| User provisioning, invite, bulk CSV import, multi-role assignment | ✅ | Bulk import is N+1 serial auth calls |
| Roles catalogue | ✅ | Labelled "Permissions"; manages no permissions |
| School years | 🟡 | **Bulk delete removes only the first selected row** |
| Terms + term types, status state machine | ✅ | No date validation against the parent school year |
| Grading policy — transmutation ladder | ✅ | No UI for program-specific ladders |
| Grading policy — period templates | 🟡 | **Component 100% total shown as required, never enforced** |
| Grading policy — special grades | 🟡 | **Configurable but no role can ever assign one** |
| Evaluation templates + bulk import | 🟡 | **`Multiple Choice` has no options editor** |
| Academic thresholds | ✅ | Feeds grading, analytics, and the AI alike |
| Audit log viewer | 🟡 | No export; IP column records the pooler |
| System settings | ✅ | |
| Dashboard | 🟡 | Counts `pending_clearances` for a cut feature |

### Dean — [chapter 05](05-role-dean.md)

| Capability | Status | Note |
|---|---|---|
| Departments (+ bulk delete) | ✅ | Only Dean entity using the routed-detail pattern |
| Programs + levels, CSV import | ✅ | |
| Courses + types, prerequisites, CSV import | 🟡 | **Editing a split course wipes its laboratory units** |
| LEC/LAB split model | ✅ | `is_split` writes two independent courses — [see why the alternative was rejected](13-roadmap-and-status.md) |
| Curriculum maps + print | 🟡 | Delete has no confirmation; no duplicate or unit-total checks |
| Sections + CSV import + grading inheritance | 🟡 | **Course filter fully built and unreachable from the UI** |
| Copy grading setup to sections | ✅ | |
| Faculty load & schedule conflicts | 🟡 | **A failed conflict query looks identical to "no conflicts"** |
| Dashboard | 🟡 | Primary CTA doesn't deep-link to the section it names |

### Registrar — [chapter 06](06-role-registrar.md)

| Capability | Status | Note |
|---|---|---|
| Student registry + bulk CSV import | ✅ | **No export anywhere in the role** |
| Academic records — transcript, curriculum audit, insight | ✅ | Clean shared access gate |
| Student lifecycle — status change, program shift | 🟡 | Progression events render as `"None → None"` |
| Enrollment workspace, eligibility, overrides | ✅ | Drop reason hardcoded empty |
| Bulk enroll via CSV | ✅ | |
| Batch progression + auto-enroll | 🟡 | **Not transactional; no partial report on failure** |
| Grade release + scheduled sweep | 🟡 | **Admin locked out; `'Submitted'` grades unreleasable** |
| Dashboard | 🟡 | |

### Faculty — [chapter 07](07-role-faculty.md)

| Capability | Status | Note |
|---|---|---|
| Sections list, roster, per-student drill-down | ✅ | |
| Attendance sessions + records | ✅ | Auto-seeds everyone as Present |
| Grading components, lock, grade sheet | ✅ | |
| Calculate grades | 🟡 | **No confirmation; per-student `failures[]` discarded** |
| Assessment builder + question bank CSV import | ✅ | No reorder; delete has no confirmation |
| Assessment attachments | ❌ | **Panel is dead code — faculty cannot attach files** |
| Submissions grading (per-question + rubric) | 🟡 | **Auto-graded answers cannot be overridden** |
| Rubrics + copy to sections | 🟡 | Rejected create leaves a partial rubric |
| Item analysis | ✅ | No export |
| Content — modules & materials, copy to sections | ✅ | |
| Discussion | 🟡 | **Capped at 50 threads; pagination and search discarded** |
| Section insight | ✅ | |

### Student — [chapter 08](08-role-student.md)

| Capability | Status | Note |
|---|---|---|
| Schedule with conflict-aware layout + colours | 🟡 | Ignores term; 07:00–21:30 only |
| Subjects + detail (5 lazy tabs) | ✅ | |
| **Taking an assessment** | ❌ | **No resume — a refresh burns an attempt and locks you out** |
| **Timed assessments** | ❌ | **Auto-submit is refused; submission stranded forever** |
| Assessment results | ✅ | Answer key correctly withheld server-side |
| Grades with evaluation gate | ✅ | Search box is inert |
| Faculty evaluation | 🟡 | One-shot, no amend path |
| Curriculum audit + printable checklist | ✅ | |
| Personal insight & honours trajectory | ✅ | Current term only |
| Announcements, events, notifications | ✅ | |

### Cross-cutting

| Capability | Status | Chapter |
|---|---|---|
| Auth, invite, onboarding gate, role switching | ✅ | [02](02-auth-and-rbac.md) |
| **Service-role key kept out of the client** | ❌ | **[02 §2](02-auth-and-rbac.md) — critical** |
| RBAC guards on RPCs | 🟡 | ~47 of ~200 — [02](02-auth-and-rbac.md) |
| Row Level Security | 🟡 | ~14 of ~55 tables |
| Server-side active-role enforcement | ⬜ | Function exists, never called |
| Announcements, events, audience resolution | ✅ | [09](09-shared-features.md) |
| Notifications | 🟡 | Silent; failure reads as zero unread |
| Storage | 🟡 | Bypasses the wrapper; files never deleted |
| Internationalisation | ⬜ | Declared in the stack, **not implemented** |
| Learning analytics engine | ✅ | [12](12-analytics-and-ai.md) |
| AI advisor (Gemini Edge Function) | ✅ | [12](12-analytics-and-ai.md) |
| **AI evaluation set** | ⬜ | **The largest thesis gap** — [14 §A](14-assessment-pros-cons.md) |
| Automated tests | ⬜ | None exist |
| Database migrations | ⬜ | Applied by hand; live schema unverifiable |
| Data export | ⬜ | Nowhere in the application |

---

## 📖 Glossary

Terms that are easy to confuse. Getting these straight makes every other chapter readable.

| Term | Means |
|---|---|
| **School year** | The outer academic container, e.g. `SY-2025-2026`. Owns terms. |
| **Term** | A semester/trimester within a school year. Carries a `term_type` and a status that advances through a lifecycle. |
| **Term type** | The *kind* of term — First Semester, Second Semester, Summer. A reusable catalogue entry. |
| **Program** | A degree, e.g. BSIT. Belongs to a department. |
| **Program level** | Year-level catalogue entry (1st–4th Year) used by curriculum maps and student records. |
| **Course** | A subject in the catalogue, e.g. `CS101`. Has lecture and laboratory units; `total_units` is a generated column. |
| **Split course** | A course created with `is_split = true` writes **two rows**, `<CODE>_LEC` and `<CODE>_LAB`, which are thereafter fully independent courses. This is how lecture/lab separation works — see [13](13-roadmap-and-status.md) for why the alternative model was rejected. |
| **Curriculum map** | The program prospectus: which courses a program takes at which year level and term. The basis of the degree audit. |
| **Section** | A specific offering of a course in a specific term, with an assigned faculty member, room, schedule, and slot cap. |
| **Enrollment** | One student in one section. The join record that everything student-facing hangs off. |
| **Grading period** | An admin-owned time division of a term (e.g. Prelim / Midterm / Finals), each with its own weight. Faculty cannot change period weights. |
| **Grading component** | A faculty-owned scoring bucket *within* a grading period (e.g. Quizzes 30%, Exams 50%). Components within a period may not exceed 100% in total. |
| **Grading period template** / **component template** | The institution-wide defaults that a new section's grading schema is cloned from. |
| **Transmutation** | Converting a raw percentage into the Philippine 1.00–5.00 grade scale via a 10-rung ladder. **Lower is better**; 1.00 is the highest, 5.00 is failing. |
| **Special grade** | A non-numeric outcome (e.g. INC, DRP) with its own rules about absences and completion deadlines. Configured by Admin. |
| **`section_final_grades`** | The computed per-student, per-grading-period grade record. Distinct from an enrollment. |
| **Grade release** | The registrar action that makes computed grades visible to students. Gated on faculty evaluation completion, and schedulable. |
| **GWA** | General Weighted Average — units-weighted, computed over **released grades only**. |
| **Academic standing** | Derived from GWA against the configurable `academic_thresholds` table (Summa / Magna / Dean's List / Good Standing / Probation). |
| **Batch progression** | The registrar bulk operation that advances a cohort's year level and auto-enrolls them into the next term's curriculum-mapped sections. |
| **Evaluation** | Student's evaluation *of* a course/faculty member. Gates grade release. Not to be confused with assessment. |
| **Assessment** | A quiz, exam, activity, assignment, project, or lab report that students take. |
| **Submission** | One student's attempt at one assessment. Has its own state machine. |
| **Rubric** | A criteria-based scoring scheme that can be attached to an assessment as an alternative to per-question points. |
| **Competency** | A learning outcome tag that can be attached to assessment questions, enabling fine-grained mastery analytics. Optional — analytics degrade gracefully to assessment-type granularity when untagged. |
| **Soft envelope** | The `{ success: boolean, message: string }` JSONB shape an RPC returns to trigger an automatic toast. |
| **Definer function** | A `SECURITY DEFINER` PostgreSQL function — runs with the *owner's* privileges and **bypasses RLS**. Must carry its own caller check. |

---

## ⚠️ The four things to know before reading anything else

1. **The Supabase service-role key is inlined into the browser bundle.** `VITE_SUPABASE_SERVICE_ROLE_KEY` is read via `import.meta.env` in [supabase.admin.ts](../../src/services/supabase.admin.ts), and Vite inlines every `VITE_*` variable at build time. Any visitor can extract it and issue unrestricted, RLS-bypassing requests. This is the highest-severity finding in the system and it makes most other authorization work moot against a motivated attacker. Full detail in [02](02-auth-and-rbac.md).

2. **There is no migration runner.** Every schema change is authored as a file in `docs/sql/` and applied to live Supabase **by hand**. The live database has already been observed diverging from `docs/sql` — duplicated function overloads, stale signatures, functions that were never applied. What `docs/sql` says is the *intent*, not verifiably the *reality*. See [03](03-data-model.md).

3. **There are no automated tests.** No test runner is configured. `npm run build-dev` (which runs `tsc -b`) plus targeted `eslint` is the complete verification story. Every behavioural claim in these chapters was verified by reading code, not by running it.

4. **`supabase_ai_context.sql` at the repo root is deliberately frozen and known stale.** Over 100 of the `fn_*` names the frontend calls do not appear in it. `docs/sql/*.sql` is the source of truth for functions; the dump is only a rough reference for tables and enums.

---

*Generated from a full read of the codebase, `docs/sql/`, `docs/plans/`, and both QA remediation trackers.*
