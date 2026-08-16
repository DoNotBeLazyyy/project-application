# 14 — Pros, Cons & Recommendations

An honest assessment through two separate lenses, as you asked: **§A — thesis defense readiness** and **§B — engineering health**. They pull in different directions, and conflating them is how people spend a week polishing code no panel will look at.

Read [13 — Roadmap & Status](13-roadmap-and-status.md) first if you haven't; this chapter builds on it.

## Contents

- [§A — Thesis defense readiness](#a--thesis-defense-readiness)
  - [A1. What the contribution actually is](#a1-what-the-contribution-actually-is)
  - [A2. Your five strongest slides](#a2-your-five-strongest-slides)
  - [A3. What a panel will attack](#a3-what-a-panel-will-attack)
  - [A4. Pre-submission checklist](#a4-pre-submission-checklist)
- [§B — Engineering health](#b--engineering-health)
  - [B1. Genuine strengths](#b1-genuine-strengths)
  - [B2. The liabilities](#b2-the-liabilities)
  - [B3. Prioritised fix list](#b3-prioritised-fix-list)
- [§C — If you only do ten things](#c--if-you-only-do-ten-things)

---

# §A — Thesis defense readiness

## A1. What the contribution actually is

Be precise about this, because the wrong framing invites the wrong questions.

**It is not "I built an LMS."** Every panel has seen an LMS. The CRUD is table stakes and inviting scrutiny of it is inviting the weakest part of the work to be examined.

**It is not "I added a chatbot."** Every panel has now seen a chatbot too, and "I wrapped an LLM around my database" is the least defensible version of this project.

**The contribution is the architecture that makes AI advising trustworthy in an academic-records system:**

> A learning-analytics engine computes every signal in PostgreSQL — GWA, composite at-risk scores, competency mastery, honours trajectories — from one configurable threshold table. The UI reads those functions. The AI reads *the same functions*, through a single read-only `SECURITY INVOKER` RPC scoped to the caller's JWT, and explains rather than calculates. **The AI cannot state a number that disagrees with the transcript, and it cannot perform an action, because no write surface is exposed to it.**

That is a claim about *design*, provable by inspection, in a domain where a hallucinated honours projection or a leaked grade is a serious failure. It is much stronger than any claim about features.

**The second contribution, and don't undersell it:** while threat-modelling the assistant, you found and fixed a live cross-student grade leak. `fn_list_grade_sheet` and `fn_list_section_students` were `SECURITY DEFINER` with no caller check, and PostgreSQL grants `EXECUTE` to `PUBLIC` by default — so **any authenticated student could read any class's grades from the browser console.** That is a real vulnerability, in a real system, found by a systematic method, and fixed. It is a research result in its own right.

---

## A2. Your five strongest slides

Each of these is already true; you just need to show it.

### 1. The read-only guarantee is structural, not prompted

Show the Edge Function's entire data surface: **one function**, `fn_get_assistant_context`, `SECURITY INVOKER`, built on the caller's JWT.

The line to say: *"The guarantee is enforced by the surface, not by the prompt."* A prompt-based restriction is a request the model may ignore. Here there is no write RPC exposed for it to call.

**Live demo:** temporarily swap the function's client to the service-role key and show the reads return empty — proving the JWT is load-bearing, not decorative. Revert immediately.

### 2. The answer key is withheld server-side

`fn_get_my_assessment_result` wraps **every** score-bearing field, including `choices[].is_correct`, in `CASE WHEN v_results_available THEN … ELSE NULL END`.

**Live demo:** open devtools, take a quiz, inspect the network response before results are released. The key is not there. Most implementations hide it in the UI and ship it in the payload — this one doesn't.

### 3. The grade leak you found and fixed

Before/after, in the browser console:

```js
supabase.rpc('fn_list_grade_sheet', { p_section_id: '<some other section>' })
```

Before: rows. After: `42501 Forbidden`. Screenshot both.

Pair it with the method that found it — auditing every `SECURITY DEFINER` function for an `auth.uid()` predicate — because the method generalises and the bug doesn't.

### 4. Item analysis: real psychometrics from live data

Classical test theory computed in PostgreSQL — difficulty index (p-value) and discrimination index (D) per question, with server-computed labels, fed by actual submissions.

This closes the loop from *"the cohort did badly"* to *"question 7 has negative discrimination; the question is the problem, not the students."* It is more academically substantial than most LMS analytics and it is already built.

### 5. Graceful analytics degradation

Mastery analytics compute by assessment type with zero setup, and **automatically deepen to competency level** wherever questions are tagged — with the UI announcing which mode it's in.

The line: *"the system is useful on day one and improves as tagging happens, with no migration and no broken intermediate state."* That is a design decision a panel can appreciate without knowing the codebase.

---

## A3. What a panel will attack

Ranked by likelihood × damage. Prepare an answer to every one.

### 🔴 1. "How did you evaluate the AI?"

**This is your weakest point and it will be asked.** Right now the honest answer is "I didn't."

Your own spec called for ~40 questions with known-correct answers spanning navigation, single-tool lookups, multi-tool aggregation, and **an adversarial refusal set**, reporting three numbers: tool-selection accuracy, answer correctness, and refusal rate. None of it exists.

The refusal set matters most: it demonstrates the security property **empirically** rather than only architecturally. And it is the cheapest chapter in the thesis — a spreadsheet, a seeded test student, and an afternoon.

**Do this. It is the highest-value remaining work in the entire project.** Without it, "the AI is safe" is an argument. With it, it's a measurement.

### 🔴 2. "The service-role key is in your JavaScript bundle."

If anyone opens devtools on the deployed app, every security claim you make collapses in front of the panel.

`VITE_SUPABASE_SERVICE_ROLE_KEY` is read via `import.meta.env` in `supabase.admin.ts`, and Vite inlines every `VITE_*` variable at build time. It bypasses RLS entirely and carries full `auth.admin` privileges.

**Fix before submission — see [02 §2](02-auth-and-rbac.md).** Move the four `auth.admin` operations into an Edge Function holding the key as a function secret, delete `supabase.admin.ts`, and **rotate the key** (it is already in every deployed bundle and browser cache).

If you cannot fix it in time, **you must disclose it as a known limitation** rather than let it be discovered. A disclosed, understood, correctly-diagnosed vulnerability with a stated remediation is a defensible position. An undisclosed one found live is not.

### 🟠 3. "You said the system has role-based access control. Show me."

The honest answer: **~47 of ~200 RPCs carry a `fn_assert_role` guard, and ~14 of ~55 tables have RLS policies.**

Do not overstate this. Reframe it as the deliberate, documented decision it actually was: the roadmap **explicitly time-boxed** the retrofit — guard all new RPCs from creation, fix the two known holes immediately, retrofit the rest only if hours remain. That is engineering judgement under a deadline, and saying so is stronger than being caught claiming full coverage.

Have the number ready. Being able to say "47 of about 200, prioritised by exposure, and here's the guard that all new ones are born with" reads as rigour.

### 🟠 4. "Is the analytics engine actually novel, or is it reporting?"

Fair question. The defensible parts:
- **The composite at-risk model** — score, attendance, and missing submissions combined into one score with a threshold — is a *model*, not a filter
- **Honours trajectory projection** — "you need to average X across your remaining units" requires units-weighted forward projection against a configurable threshold table
- **Competency mastery with automatic granularity degradation**
- **Classical item analysis**

The weak spot: **the risk-score formula is not documented or justified anywhere outside the SQL.** There is no written rationale for the weighting. Write one paragraph explaining why those three inputs, in that proportion. That single paragraph turns "arbitrary" into "a model."

### 🟠 5. "You have no tests."

True, and there is no way around it. The best available answer:
- Type-level verification via `tsc -b` on every build, in TypeScript strict mode
- Business logic is concentrated in the database, where a bad state is often structurally prevented (the grading lock, `ON DELETE RESTRICT`, partial unique indexes)
- A two-round manual QA pass across all five roles, **with published, resumable remediation trackers** — show `docs/qa-findings-remediation.md`; it's genuinely good evidence of process

Then be honest: an automated suite would have caught several of the defects in this documentation, and that is a stated limitation and future work.

### 🟠 6. "Demonstrate a student taking a timed assessment."

**Do not do this live without fixing the flow first.** Right now:
- A refresh burns an attempt and locks the student out at `max_attempts = 1`
- If the timer runs out, the submission is stranded `In Progress` forever
- A scheduled-publish assessment starts and then dead-ends on "Access denied."

Any of these on stage is unrecoverable. See [10 §13](10-assessment-engine.md); the resume fix in particular is small — the engine already supports resumption, only the entry point doesn't use it.

### 🟡 7. "Your 'Permissions' screen doesn't manage permissions."

Correct, and it's a fair catch. The answer is the documented design decision: RBAC is static and code-level by §10 single-responsibility; the admin decides *"this person is a Dean,"* not *"a Dean may call fn_X."* A configurable matrix would add a privilege-escalation surface for no benefit.

Then concede the label is wrong. **Better: rename it to "Roles" before submission** — a one-line change that removes the question entirely.

### 🟡 8. "Why did you choose Gemini?"

Free tier, and the key never reaches the browser. Have the retry story ready — three attempts with fallback to `gemini-flash-lite-latest`, because free-tier capacity is shared and 429s happen. That level of operational thought reads well.

### 🟡 9. Questions about the institution's own hymn

If a panel member from Arellano reads a misquoted hymn on your student dashboard, it is a small, avoidable, and memorable embarrassment. **Verify or remove.** See [13 §5](13-roadmap-and-status.md).

---

## A4. Pre-submission checklist

In priority order. Items 1–4 are the ones that change outcomes.

| # | Task | Effort | Why |
|---|---|---|---|
| 1 | **Build the AI evaluation set** — ~40 questions incl. adversarial refusals; report tool-selection accuracy, answer correctness, refusal rate | 1 day | Turns your central claim from argument into measurement. **The single highest-value task.** |
| 2 | **Remove the service-role key from the bundle** and rotate it | 0.5 day | Otherwise one devtools window ends the defense |
| 3 | **Fix assessment resume + timer auto-submit** | 0.5 day | Makes the student flow demonstrable |
| 4 | **Verify the hymn and core values, or remove the panel** | 1 hour | Avoidable embarrassment |
| 5 | **Write the risk-score justification paragraph** | 1 hour | Converts "arbitrary" to "a model" |
| 6 | **Count your actual RBAC coverage** and prepare the framing | 1 hour | Turns a weakness into evidence of judgement |
| 7 | **Tag one assessment's questions with competencies** | 1 hour | So fine-granularity mastery actually renders in the demo |
| 8 | **Rename "Permissions" → "Roles"** | 5 min | Removes a question |
| 9 | **Rehearse the three security demos** (grade leak before/after, answer key in devtools, service-role swap) | 1 hour | These are your best slides |
| 10 | **Delete or relocate the 7 orphan HRIS plans** | 5 min | Nothing in a thesis repo should say "Non-Holiday Pay Rates" |
| 11 | **Commit `Findings 2.docx` and write its tracker** | 1 hour | Round 2's outcomes are currently unrecoverable from the repo |
| 12 | Add export to item analysis and the audit log | 0.5 day | Your best evidence is trapped on screen |

---

# §B — Engineering health

## B1. Genuine strengths

Not padding. These are things this codebase does better than most projects of its size.

### 1. Architectural consistency is real, not aspirational

**Zero `supabase.from()` chains outside `src/services/`. Zero relative imports. Every service returns `ServiceResult<T>`. Every data call goes through one wrapper.** In a ~60-page application built under deadline, that is unusual discipline, and it is why a reader can predict where any given piece of logic lives.

### 2. The thick-DB paradigm is actually followed

Business logic genuinely lives in PostgreSQL. The client-side exceptions number about six and are almost all presentational. This buys real properties: logic cannot be bypassed by calling the API differently, and the AI reads the same computation the UI does.

### 3. The shared component layer pays off visibly

`CommonTableCard` gives every list screen server pagination, search, sort, filter, modals, bulk delete, and a dirty-form guard for free. Six of the eight QA UI fixes landed in shared components and therefore **applied everywhere at once**. That is the return on the abstraction, measured.

### 4. Guard functions are well-factored

`fn_assert_role`, `fn_assert_section_staff`, `fn_can_access_section`, `fn_is_section_faculty`, `fn_owns_submission`, `fn_resolve_record_student` — small, composable, single-purpose. `fn_resolve_record_student` in particular is excellent: one access gate, reused by four RPCs, which is what lets the same transcript component safely serve both registrar and student.

### 5. Several security controls are correct in ways commonly got wrong

Server-side answer-key withholding. Server-side grade NULLing behind the evaluation gate. `fn_resolve_audience` revoked from `authenticated`. The AI's single-RPC surface. These aren't accidents.

### 6. The cross-section reuse standard is consistently applied

One pattern — deep-copy into independent per-section copies, guarded by "you must teach source and every target" — implemented three times for assessments, modules, and rubrics. Consistency across instances is harder than any one instance.

### 7. The remediation trackers are exemplary process

`docs/qa-findings-remediation.md` and `docs/silent-failure-remediation.md` are better than most professional teams produce: root-cause analysis, per-item status, explicit "rejected, do not rebuild" reasoning with the failure mode spelled out. **The F1 rejection write-up is a model of its kind.**

---

## B2. The liabilities

### 🔴 L1 — Service-role key in the client bundle

Covered in [02 §2](02-auth-and-rbac.md). **Impact: total.** Effort: 0.5 day. Nothing else on this list matters as much.

### 🔴 L2 — No migration runner; the live schema is unverifiable

47 SQL scripts applied by hand. No ledger, no ordering guarantee, no rollback, **no way to know what is actually running.**

The drift is documented, not hypothetical: `fn_update_user` at the wrong arity, `fn_create_term` with 7 params vs 8, **duplicate overloads of `fn_list_school_years_json` live simultaneously** (a standing PostgREST `PGRST203` hazard), and several functions the frontend calls that exist in no script at all.

The compounding consequence: **the security posture in [02](02-auth-and-rbac.md) describes intent, not deployment.** You cannot currently prove the retrofit is live.

**Recommendation:** adopt Supabase CLI migrations (the CLI is already a dev dependency and the project is already linked). Even without back-filling history, start by dumping the live schema, diffing it against `docs/sql/`, and **writing down what the differences are**. That diff is the single most valuable artefact this project doesn't have.

**Impact: high. Effort: 1–2 days for the diff; more for full migration adoption.**

### 🔴 L3 — Zero automated tests

No runner, no test files. `tsc -b` plus targeted `eslint` is the whole verification story.

The cost is visible in this documentation: the assessment resume bug, the timer dead end, the `server_expires_at` mismatch, the rubric denominator mismatch, the school-year bulk-delete bug — **every one of these would have been caught by a modest integration suite.**

**Recommendation:** don't attempt broad coverage. Add Vitest and write tests for exactly three things — the enrollment state machine, `fn_calculate_final_grade`, and the assessment submission lifecycle. Those three carry most of the system's risk.

**Impact: high. Effort: 2–3 days for meaningful coverage of the critical paths.**

### 🟠 L4 — The silent-failure class is only a third fixed

SF1–SF3 are done and were high-leverage. **SF4–SF8 are all untouched**, and this review found concrete instances of each. The worst two:
- **`fn_calculate_all_grades_for_period`** — no success toast, and `failures[]` discarded, on the most consequential faculty action
- **`fn_list_schedule_conflicts`** — silent, so a failed query is **indistinguishable from "no conflicts found"** on a screen whose entire purpose is surfacing conflicts

**Impact: medium-high. Effort: SF6 and SF8 are ~1 day combined; SF7 needs an RPC audit.**

### 🟠 L5 — Three ownership predicates for one concept

`fn_is_section_faculty` (owner-only), `fn_assert_section_staff` (owner + Dean/Registrar/Admin), and a raw inline `sections.faculty_id = auth.uid()` in publish/unpublish. Three answers to "may this person act on this section," no single source of truth. Combined with **two coexisting denial conventions** (`RAISE 42501` vs soft envelope), identical failures render differently on different screens.

**Effort: 1 day to consolidate.**

### 🟠 L6 — Features that exist but cannot be reached

A recurring pattern, and each instance is a small amount of wasted work plus a support burden:

| Feature | Built | Reachable |
|---|---|---|
| Section filter by course | types + service + SQL | ❌ no form control |
| Special grade assignment | catalogue + storage + every display path | ❌ no role can set one |
| Assessment attachments | RPCs + a 140-line panel | ❌ panel never imported |
| Discussion pagination and search | full RPC support | ❌ hardcoded to page 1, size 50 |
| Per-student batch progression | RPC parameter | ❌ always sends null |
| Program-specific transmutation ladders | full engine support | ❌ no UI |
| Evaluation search and status filter | full RPC support | ❌ always sends `''` |
| `p_term_id` on student insight | RPC parameter | ❌ always null |
| Data export | — | ❌ nowhere in the app |

**Recommendation:** for each, either wire it up (most are an hour) or delete the dead half. Leaving both is the worst option.

### 🟠 L7 — Non-transactional writes in three places

`fn_run_batch_progression` (mid-loop failure leaves partial promotions with **no partial report**), `fn_create_rubric` (returns mid-loop, leaving a partial rubric), and the single-user invite (auth user created, profile insert fails, user permanently stuck).

**Effort: 0.5 day.**

### 🟡 L8 — Convention drift

Two refresh idioms (`refreshKey` vs the `setActiveFilters(prev => ({...prev}))` identity hack). Three role→path derivations. `isCodeDisabled` passed on three forms and silently ignored on four. `onRequestDeleteRow` declared and unused in **all twelve** table-config hooks. `EntityFormPage` adopted by 2 of 15 candidate screens.

None of these is a bug. Together they mean a reader cannot trust that a pattern seen once holds everywhere — which is exactly what the consistency in B1 was buying.

### 🟡 L9 — Documented but non-existent

`react-i18next` with no `src/locales` and zero `useTranslation` call sites. `@locales` and `@themes` aliases pointing at non-existent directories. `axios` in a Supabase app. `dotenv` as a runtime dependency in Vite. **Three icon libraries.** `@types/react@19` against `react@18`. A `/lms-api` dev proxy with no caller. `CLAUDE.md` referencing a `.prettierrc.json` that doesn't exist and a `formErrors` alert that was removed.

**Recommendation:** one cleanup commit — remove the four unused dependencies, delete the two dead aliases, fix the two `CLAUDE.md` claims, align the React types.

### 🟡 L10 — Two known scaling problems

`fn_list_grade_release_schedule` calls `fn_check_evaluation_completion` **per grade row inside a lateral aggregate** — O(grades) plpgsql calls per period per page load. And there is **no data-fetching layer at all** (no React Query/SWR), so every page refetches imperatively on every mount and every tab switch, with `SubjectDetailPage` the sole exception.

---

## B3. Prioritised fix list

Impact × effort. **Do the top block first.**

### Critical — do before anything else

| Fix | Effort | Chapter |
|---|---|---|
| Remove the service-role key from the bundle; rotate it | 0.5 d | [02](02-auth-and-rbac.md) |
| Assessment resume path | 2 h | [10 §5](10-assessment-engine.md) |
| Timer auto-submit + populate `server_expires_at` + schedule the sweep | 4 h | [10 §6](10-assessment-engine.md) |
| `fn_get_assessment_questions_for_student` — honour `scheduled_publish_at` | 15 min | [10 §4](10-assessment-engine.md) |
| Reconcile rubric total with `assessment_items.total_points` | 2 h | [10 §8](10-assessment-engine.md) |
| School-year bulk delete (deletes only the first row) | 15 min | [04 §4](04-role-admin.md) |
| `updateCourse` wiping laboratory units | 15 min | [05 §7](05-role-dean.md) |

**That whole block is roughly 1.5 days and removes every critical data-loss and security defect in the system.**

### High — before a live demo

| Fix | Effort |
|---|---|
| Surface `failures[]` and add a success message to `fn_calculate_all_grades_for_period` | 1 h |
| Un-silence `fn_list_schedule_conflicts` | 30 min |
| Allow Admin to operate grade release | 15 min |
| Add a role guard to `fn_list_grade_release_schedule` | 15 min |
| Resolve the `'Submitted'` grade status dead end | 1 h |
| Confirmation prompts on assessment delete, curriculum-map delete, special-grade delete | 1 h |
| Enforce the component 100% invariant, or change the copy to match reality | 1 h |
| Make batch progression transactional with a partial report | 3 h |
| Evaluation `Multiple Choice` options editor — or remove the type | 4 h |
| Discussion pagination and search | 2 h |
| Fix `describeEvent` for `Year Level Progression` | 15 min |

### Medium — sustained health

| Fix | Effort |
|---|---|
| Diff the live schema against `docs/sql/` and document the delta | 1–2 d |
| Adopt Supabase CLI migrations | 2–3 d |
| Vitest + tests for the three critical paths | 2–3 d |
| Close SF6 and SF8 | 1 d |
| SF7 RPC audit | 2 d |
| Consolidate the three ownership predicates and two denial conventions | 1 d |
| Wire up or delete each unreachable feature in L6 | 1 d |
| Add data export (student registry, audit log, item analysis, grade sheet) | 1 d |
| Special grade assignment UI | 1 d |

### Low — polish

Consistent refresh idiom · consolidate role→path derivation · `isCodeDisabled` consistently applied or removed · delete `onRequestDeleteRow` from all 12 hooks · dependency cleanup · icon-library consolidation · `EntityFormPage` migration · fix `CLAUDE.md`'s two wrong claims · `'Dean'` fallback in three layouts · sidebar icon differentiation.

---

# §C — If you only do ten things

Both lenses, merged and ranked. This is the list.

| # | Do this | Why | Effort |
|---|---|---|---|
| 1 | **Build the AI evaluation set** (~40 questions + adversarial refusals; report 3 numbers) | Turns your central thesis claim from argument into measurement | 1 d |
| 2 | **Remove the service-role key from the bundle and rotate it** | One devtools window otherwise ends the defense | 0.5 d |
| 3 | **Fix assessment resume and timer auto-submit** | Makes the student flow demonstrable and stops real data loss | 0.5 d |
| 4 | **Diff the live schema against `docs/sql/`** | You currently cannot prove what security is deployed | 1 d |
| 5 | **Fix the six other critical data-loss bugs** (rubric denominator, `scheduled_publish_at`, bulk delete, lab units, `'Submitted'` grades, batch-progression atomicity) | Each is silent and each corrupts real records | 1 d |
| 6 | **Surface `failures[]` on Calculate Grades; un-silence conflict detection** | The two worst silent failures, on the two screens where silence is most dangerous | 1 h |
| 7 | **Verify the hymn and core values** | Avoidable embarrassment in front of the institution | 1 h |
| 8 | **Write the risk-score justification paragraph** | Converts your model from arbitrary to defensible | 1 h |
| 9 | **Add Vitest + tests for the three critical paths** | Stops the next silent regression; answers the "no tests" question with a plan | 2 d |
| 10 | **Repo hygiene: delete the orphan HRIS plans, rename "Permissions", commit the Findings-2 tracker, drop the four dead dependencies** | Cheap, and every one of them is something a reader will otherwise trip over | 2 h |

**Total: roughly one focused week.** Items 1–3 and 7 are the ones that change the defense outcome; do them first even if nothing else gets done.

---

## A closing note

The uncomfortable pattern worth naming: **almost every serious defect in this documentation is a silent one.** Grades that are quietly wrong. Deletes that report success and delete one row. Conflict detection that fails identically to finding nothing. Submissions stranded forever with no error. A feature configured but never assignable.

That is not a coincidence — it is the direct cost of §B's L3 (no tests) and L4 (the unfinished silent-failure workstream) compounding. The system rarely tells you when it's wrong, and there's no test suite to tell you either.

The good news is the inverse: **the architecture is sound enough that these are mostly small, local fixes rather than redesigns.** The resume bug is a missing branch in one function. The rubric mismatch is a validation. The grade-leak class was already found and the method for finding more is already established. Roughly one week of focused work moves this from "impressive but fragile" to "impressive and solid" — and the parts a panel will actually examine are already the strongest parts of the system.
