# AU-JAS LMS — Final Locked Design (Learning-Analytics Thesis)

## Context
The LMS is half-built. This is the **complete, locked design** so execution runs waterfall with no structural rework — the plan is where every "I want this and that" is decided; the code phase just executes. Organizing principle: **dependency order — nothing is built before what it depends on.**

**Thesis centerpiece (THE contribution):** a **data-driven learning-analytics engine** that turns the LMS's own data into actionable insight, delivered by a **two-sided AI advisor** — students see where they stand, what's dragging them, and what to aim for (Latin honors, career-relevant mastery); faculty see who's at risk, on what, and how to intervene. **The DB computes every signal; the AI explains and advises** (thick-DB, accurate, safe — a hallucinated risk-flag or honors projection is unacceptable).

**Locked decisions:** clearances **cut**; insight depth = **medium-compute now on a fine-ready schema**; AI advisor is **two-sided** (student + faculty + all-role how-to), strictly read-only. Provider: **Google Gemini Flash via Supabase Edge Function** (spec `curried-shamir.md`).

---

## 🔥 2-WEEK DO-OR-DIE EXECUTION (build the FULL plan)

**Commitment:** the full plan in 1–2 weeks. **Team:** developers = **you + Claude** (Claude generates the bulk of SQL/services/UI; you review, apply `docs/sql` to live Supabase, integrate) + **2 dedicated testers** verifying features end-to-end in parallel (removes the solo-verification bottleneck). Build in the **dependency order below — nothing before its dependency — so any slip drops only the least-critical tail.**

**Protect the centerpiece:** Phase 4 (analytics engine) + the AI capstone are the thesis contribution — never cut.
**Time-box the tail:** Phase 7 (RBAC retrofit of ~200 RPCs) is capped — guard all NEW RPCs from creation (0.1) + fix the two known definer holes (`fn_list_grade_sheet`, `fn_list_section_students`) now; retrofit the remaining ~198 only if hours remain. Phase 8 (rubrics) only if ahead of schedule.

**Working loop:** Claude generates a feature's SQL + service + types + UI → you apply SQL to live Supabase + wire it → testers exercise it → next feature. Regenerate `supabase_ai_context.sql` after each SQL batch so we never build on a stale snapshot.

**Prereqs for the AI capstone (start acquiring in parallel):** Supabase CLI installed + project linked (no `supabase/` dir yet); `GEMINI_API_KEY`. Phase 0 needs neither — we start there immediately.

---

## BUILD ORDER — all phases, this sprint

## UI Navigation & UX Convention (best-practice + consistent — applies to EVERY screen)
**Rule: records get URLs; transient actions get modals.** (User priority: best-practice/user-friendliness over deadline, and consistency across the app.)
- **Full-page routes** for viewing / creating / editing a record: `list → /entity/:id` (detail/edit) and `/entity/new` (create). Deep-linkable, bookmarkable, working back-button, roomy, mobile-friendly. Matches the existing `SectionDetailPage` / `AssessmentBuilderPage` route pattern.
- **Modals only** for genuinely transient, low-stakes interactions: confirmations (delete/discard/leave), filter, sort, bulk-import. These stay modal *consistently*.
- **All content-rich views are pages (mandatory):** analytics/insight panels, curriculum audit, TOR, results review, dashboards.
- **Consistency mechanism:** one shared routed **`EntityFormPage`** shell hosts the existing `*Form` components (`UserForm`, `StudentForm`, `CourseForm`, …) so every "row → detail" behaves identically app-wide. `CommonTableCard` already centralizes `onRowClick`; migration per screen = swap `handleOpenView` (modal) → `navigate('/entity/:id')` and mount the same form in the page shell — **reuse the form component, no rewrite.**
- **Scope note (honest):** migrating the current 13 modal-detail screens is real but *mechanical, pattern-based* work — a workstream, not per-screen rewrites. Establishing 0.6 first means all new features are built as pages from the start (zero rework); the 13 migrate into the shell incrementally.

## Bulk Operations Standard (cross-cutting — applies to EVERY applicable screen)
**Rule: any entity a user creates repetitively gets bulk upload.** (Professor's mandate: repetitive single-record entry — e.g. user provisioning — is an inefficient, avoidable burden on admins/staff; §11 already requires it, this makes it a hard, enforced convention, not per-screen discretion.)
- **Standard mechanism (already in §11 + already live for users/students):** each management screen exposes **"Download CSV Template" + "Upload CSV"**; the frontend parses CSV → JSON array and calls **one transactional bulk RPC** (`fn_bulk_create_<entity>` / `fn_bulk_provision_<entity>`) that loops server-side. No client-side looping of single-record calls. Bulk **delete** already exists via `CommonTable` checkbox selection → `fn_bulk_delete_<entity>`.
- **Where it applies (audit — build the missing ones as each phase touches the screen):**
  - **Admin:** users (Built) · school years / terms · evaluation templates (Built) · academic thresholds seed.
  - **Dean:** departments · programs · program levels · courses · course prerequisites · curriculum-map rows · **sections** (highest-volume repetitive entry). Courses + sections are the biggest wins here.
  - **Registrar:** students (Built) · enrollments (bulk-enroll Built).
  - **Faculty:** **assessment questions** (import a question bank from CSV — kills the most repetitive faculty task) · roster-scoped bulk grade entry where a grade sheet isn't already columnar.
- **Reuse, don't reinvent:** mirror the existing user/student bulk-import flow (CSV parse util + bulk RPC + `CommonTableCard` bulk-import modal — a *transient action*, so it correctly stays a **modal** under the UI convention above). Each new bulk RPC is born guarded by `fn_assert_role` (0.1) for its §10 owner.

## Cross-Section Reuse Standard (cross-cutting — the same faculty owns multiple sections)
**Rule: content a faculty authors once is replicable to their other sections — never re-entered per section.** Same efficiency principle as bulk upload, applied to the faculty side. One shared mechanism: a transactional **deep-copy `fn_*_to_sections(p_source_id, p_section_ids[])`** RPC that clones into each target as **independent per-section copies** (no shared-master rework; `section_id`/per-section grading stay intact), guarded by `fn_assert_role('FACULTY')` (0.1) with a check that the caller teaches source + every target. Instances (all locked): **assessments** (2.x), **modules/materials** (2.y), and **announcements to multiple sections at once** (Phase 1, via the audience core 0.3 — a Section-audience extension, not a new copy). A heavier sibling — **copy a section's grading config/components into another section or the next term** (rollover) — is locked to **Phase 5** (registrar/dean lifecycle), not this content flow.

## PHASE 0 — Foundations (everything sits on these)
- **0.1 RBAC guard.** `fn_current_user_role_codes()`, `fn_assert_role(VARIADIC text)`, `REVOKE EXECUTE ... FROM anon`. Every new RPC asserts its §10 owner from creation. *Also fixes the live weakness in `fn_list_grade_sheet` / `fn_list_section_students` (RLS-bypass, no caller check).*
  - **RBAC model = STATIC, code-level (locked decision).** The role→capability binding is fixed at design time by §10 and hard-coded via `fn_assert_role('<Role>')` in each function body — there is **no** admin-configurable role↔RPC permission matrix (that would contradict §10 single-responsibility, add a privilege-escalation/misconfig surface, and cost an unneeded table + per-RPC lookup + admin UI). The **admin's** access control is limited to: managing the `roles` catalog (Built) and **assigning which users hold which roles** — i.e. the admin decides *"this person is a Dean,"* not *"a Dean may call fn_X."* Role codes are exactly `Admin` / `Faculty` / `Student` / `Registrar` / `Dean` ([app.type.ts:1](src/types/app.type.ts#L1)).
- **0.2 Academic-computation core.** Admin-configurable **`academic_thresholds`** (seeded 1.25/1.50/1.75/3.00 + scholarship values); refactor `fn_get_academic_standing` to read it; ONE grade/GWA/standing/honors function every consumer calls. No contradictory numbers.
- **0.2b Grading-schema inheritance + governance.** *(Confirmed gap: [supabase_ai_context.sql:2943](supabase_ai_context.sql#L2943) `fn_create_section` does NOT seed grading components — faculty rebuild per section from scratch.)* **Inheritance:** extend `fn_create_section` (or a companion `fn_seed_section_grading`) to auto-clone the global `grading_component_templates` into the new section's `grading_components`, mapped onto the term's `grading_periods` — every section starts from a valid, 100%-summing default. **Governance = guardrails + lock, NOT approval (locked decision):** faculty freely customizes their section's components *within* the admin-defined periods (period weights are admin-owned, immutable to faculty per §10); enforced invariants — (a) component weights per period must sum to 100%, (b) admin period weights read-only to faculty, (c) **schema locks once grading has started** (any grade exists / period released) so edits can't silently rewrite computed grades, (d) every change written to `grade_audit_logs`. **No approval state machine, no dean/admin gate** — respects faculty single-responsibility, avoids a bottleneck, and the real risk (post-grading edits) is handled by the lock + audit, not by pre-approval.
- **0.3 Audience-resolution core.** `fn_resolve_audience(...)` used by announcements/events/notifications/discussion/dashboards.
- **0.4 Active-role contract.** Client passes **active role** for UX routing; server independently asserts **capability**. Never conflated.
- **0.5 Learning-analytics data foundation (fine-ready).** New competency / learning-outcome schema tied to curriculum (`courses`/`programs`), plus an optional `assessment_questions ↔ competency` link. Structure is complete now; tagging is populated progressively. Analytics compute **medium granularity** by default and **auto-deepen to fine** wherever tags exist — no restructuring later.
- **0.6 UI navigation foundation.** Build the shared routed **`EntityFormPage`** shell + per-entity `/entity/:id` (detail/edit) and `/entity/new` (create) routes; codify the "records get URLs, actions get modals" rule. Every new feature (P1–P6, capstone) uses it from creation. Existing 13 modal-detail management screens migrate into it systematically — reuse existing `*Form` components, swap the centralized `onRowClick` from `handleOpenView` → `navigate`. Confirmations / filter / sort / bulk-import remain modals. Convert the heavyweight `EnrollmentWorkspaceModal` to a page too (it's a workspace, not a dialog).

## PHASE 1 — Communication (consumes 0.3, 0.1)
Announcements (**incl. posting one announcement to multiple sections at once** via the audience core — Cross-Section Reuse Standard) → Notifications UI (bell; backend exists) → Events/calendar → Discussion/Q&A. All via the audience core; emit notifications on key events.

## PHASE 2 — Content & assessment completion (finishes half-built work)
Content delivery (modules/materials) + `material_completions` progress → Assignment submissions (file-upload/essay UI; finishes dead `File Upload`/`Essay` types) → Student results review (score, correct answers, feedback). *These produce the raw data the analytics engine consumes.*

**2.x Replicate assessment across sections (faculty efficiency).** A faculty member teaching multiple sections of the same course builds an assessment **once**, then **"Duplicate to sections"** replicates it into selected sections as **independent per-section copies** (locked decision — not a shared master). New `fn_duplicate_assessment_to_sections(p_assessment_id, p_section_ids[])`: one transaction deep-copies the `assessment_item` + `assessment_questions` + `assessment_question_choices` + `assessment_attachments` into each target section, **remapping `grading_component_id` to the same-named component in each target section** (null if none). Zero schema change — `assessment_items.section_id` stays `NOT NULL` ([supabase_ai_context.sql:10628](supabase_ai_context.sql#L10628)), so submissions/timers/grading/analytics keep working untouched; each copy keeps its own due/close window and grades independently. Guarded by `fn_assert_role('FACULTY')` (0.1) + verifies the caller teaches both the source and every target section. UI: multi-select sections in the assessment builder header (a transient action → modal, per the UI convention).

**2.y Replicate content/modules across sections (faculty efficiency).** Same mechanism for course content: build a module set / materials once, **"Publish to sections"** deep-copies `modules` + `course_materials` into selected sections as independent copies via `fn_duplicate_module_to_sections(p_module_id, p_section_ids[])` (per Cross-Section Reuse Standard). Same faculty-ownership guard; same multi-select-sections modal.

## PHASE 3 — Records & academic (consumes 0.2)
Curriculum progress / degree audit + printable **unofficial** checklist → Registrar **official** TOR/grade report + student lifecycle (shift/LOA/status). 3.1 and 3.2 share 0.2 — same data, two presentations.

## PHASE 4 — Learning Analytics engine (THE centerpiece; consumes 0.2, 0.5, and Phase 2/3 data)
One engine, two role-scoped views. All signals computed in PostgreSQL:
- **Per-student:** strengths/weaknesses (per subject + assessment-type/component + competency where tagged), grade/GWA trend, **honors & scholarship trajectory** ("distance to cum laude / to keep scholarship"), engagement (attendance + submission timeliness), **at-risk flag**, and recommended focus.
- **Per-section / faculty:** at-risk student list, per-topic/competency mastery gaps (= teaching-effectiveness signal), score distributions & item analysis (absorbs the earlier faculty item-analysis idea), cohort trends.
- **Surfaces:** student insight panel + faculty insight panel/dashboard reading these RPCs. The DB is authoritative; these numbers are exactly what the AI later narrates.

## PHASE 5 — Accounts & admin depth (consumes 0.1, 0.4)
Profile + change-password (all roles) + multi-role assignment → Admin audit-log viewer (`grade_audit_logs`) → Dean faculty-load & schedule-conflict view → **Section-setup rollover** (copy a section's grading config/components into another section or the next term — Cross-Section Reuse Standard, heavier sibling; deferred here so it never blocks the content flow).

## PHASE 6 — Dashboards (consume Phase 1 comms + Phase 4 insight)
Dean/Registrar/Faculty role landing pages (announcements/events/operational counts + insight highlights); Student dashboard gains announcements/events + insight summary. Cosmetic cleanup: wrong "Dean Panel" subtitles, dead footer `/…/settings` links, `ROLE_DASHBOARD.Dean` mismap.

## PHASE 7 — Security retrofit (late, so it never touches RPCs still in flux)
`fn_assert_role` across existing ~200 RPCs by §10 owner; tighten role-aware RLS on bypassed tables.

## PHASE 8 — Optional
Rubrics (only if time holds).

## CAPSTONE (LAST) — Two-sided AI advisor (Google Gemini)
Built against the finished system. **One engine, three modes**, all grounded in Phase 4 (DB-authoritative numbers) + 0.4 (role routing):
- **Student advising** — own trajectory/weaknesses, honors/scholarship path, "what to focus on to improve / for your career."
- **Faculty advising** — at-risk students, per-topic gaps, intervention guidance.
- **All-role how-to guide** — active-role-scoped UI/workflow help; no personal data, no actions.
Supabase Edge Function holds `GEMINI_API_KEY`, JWT-scoped so the AI only ever sees what the caller could; the model explains/advises, it never computes authoritative numbers. Full spec: `curried-shamir.md`.

**HARD CONSTRAINT — AI is strictly read-only.** In every mode the AI performs **no writes and no actions** — it only reads (JWT-scoped, DB-computed signals) and explains. **No write/mutating RPC is ever exposed to the Edge Function.** This preserves §10 single responsibility: the AI does no role's job (it cannot enroll, grade, post, edit, or provision), it only surfaces insight the caller could already access. A wrong number or an unauthorized action is a defense-failing bug; both are structurally prevented (DB-authoritative numbers + read-only tool surface).

---

## Why there is no structural rework
- Cores (0.2/0.3) and the analytics data model (0.5) exist before any consumer → no reconciliation rebuild, and fine-grained insight needs no table changes later.
- RBAC guard (0.1) exists before any new RPC → new RPCs born guarded; only *old* RPCs need the Phase 7 retrofit.
- Analytics engine (4) is built after the data that feeds it (2/3) exists; dashboards (6) and the AI capstone are built after the analytics they present exist.

## Verification (per feature, as built)
No test runner — `npm run build-dev` (typecheck) + `npm run lint` (touched files only; avoid project-wide `lint:fix`). Apply each `docs/sql/*.sql` to live Supabase, then regenerate `supabase_ai_context.sql` (avoid building on a stale snapshot). Exercise end-to-end in the dev server. Critical check for the centerpiece: every insight/advising number the UI or AI shows must match the Phase 4 engine RPCs exactly (DB authoritative).

---

## Role Capability Matrix (what each role can do — existing + planned)
Status legend: **Built** = already in the system · **P#** = delivered in that phase · **Cap** = AI capstone. Roles are single-responsibility (§10); multi-role users switch via the role switcher.

### Admin — System & Infrastructure
| Capability | What they can do | Status |
|---|---|---|
| User management | Invite / provision / bulk-import / edit / deactivate users | Built |
| Multi-role assignment | Assign multiple roles to one account | P5 |
| Roles & permissions | CRUD roles | Built |
| School years & terms | CRUD school years, terms, term types; advance term status | Built |
| System settings | Configure global settings | Built |
| Grading policy | Configure grading-period templates, transmutation tables, special grades | Built |
| Evaluation templates | CRUD + bulk-import course/faculty evaluation templates | Built |
| Academic thresholds | Configure honors / scholarship cutoffs | P0 |
| Global announcements & events | Post system-wide | P1 |
| Audit-log viewer | View grade/audit trails | P5 |
| Dashboard | System-wide stats | Built |
| AI assistant | How-to guide only (read-only) | Cap |

### Dean — Academic Architecture
| Capability | What they can do | Status |
|---|---|---|
| Departments / programs / levels | CRUD | Built |
| Courses, course types, prerequisites | CRUD **+ CSV bulk import** | Built / bulk P0-std |
| Curriculum maps | Build the program prospectus **+ CSV bulk import of rows** | Built / bulk P0-std |
| Sections | CRUD + assign faculty **+ CSV bulk import** | Built / bulk P0-std |
| Faculty load & conflicts | View teaching loads, detect room/faculty/time conflicts | P5 |
| Section-setup rollover | Copy a section's grading config/components to another section or next term | P5 |
| Announcements / events | Post | P1 |
| Dashboard | Academic-architecture landing | P6 |
| AI assistant | How-to guide only | Cap |

### Registrar — Student & Records
| Capability | What they can do | Status |
|---|---|---|
| Student registry | CRUD + bulk import | Built |
| Enrollment | Bulk enroll, drop, eligible-section workspace | Built |
| Grade release | Schedule / release grades (evaluation-gated) | Built |
| Official records | Generate official TOR / grade report | P3 |
| Student lifecycle | Program shift, LOA, status change | P3 |
| Announcements / events | Post | P1 |
| Dashboard | Enrollment / operations landing | P6 |
| AI assistant | How-to guide only | Cap |
| *(Clearances)* | *Cut from scope* | — |

### Faculty — Instructional
| Capability | What they can do | Status |
|---|---|---|
| Sections & roster | View assigned sections + student list | Built |
| Attendance | Sessions + records | Built |
| Grading | Grade sheet, components, calculation | Built |
| Grading schema | Section inherits admin template on creation; customize components within admin-locked periods; locks once grading starts; audited (no approval gate) | P0 (0.2b) |
| Assessments | Build (questions/choices/attachments/timer), publish, grade submissions | Built |
| Question-bank bulk import | Import assessment questions from CSV instead of one-by-one entry | P2 (bulk P0-std) |
| Replicate assessment to sections | Build once, duplicate an assessment into multiple sections as independent copies | P2 |
| Assignment/file grading | View + grade uploaded files / essays | P2 |
| Content authoring | Modules + materials **+ replicate to multiple sections** | P2 |
| Announcements | Post to sections **(one post → multiple sections at once)** | P1 |
| Discussion | Moderate section Q&A | P1 |
| Teaching insights | Item analysis, at-risk students, per-topic mastery gaps | P4 |
| Dashboard | Teaching landing (classes, pending grading, insight highlights) | P6 |
| AI assistant | Faculty advising (at-risk, intervention) + how-to | Cap |

### Student — Learning
| Capability | What they can do | Status |
|---|---|---|
| Schedule | Weekly view + section colors | Built |
| Subjects | View enrolled subjects & detail | Built |
| Take assessments | Timed online assessments | Built |
| Submit assignments | File upload / essay submissions | P2 |
| Grades | View released grades | Built |
| Results review | Review graded work + faculty feedback | P2 |
| Content | Consume modules/materials + mark progress | P2 |
| Curriculum progress | Degree audit + printable **unofficial** checklist | P3 |
| Evaluations | Submit course/faculty evaluations | Built |
| Announcements / events / notifications | Receive (audience-scoped) | P1 |
| Discussion | Ask / answer in sections | P1 |
| Learning insights | Personal strengths/weaknesses, honors/scholarship trajectory | P4 |
| Dashboard | Announcements/events/deadlines + insight summary | P6 |
| AI assistant | Academic advising on own data + how-to | Cap |
