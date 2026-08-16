# 12 — Learning Analytics & the AI Advisor

**This is the thesis centerpiece.** Everything else in the system is a competent LMS; this chapter is the contribution. It covers the learning-analytics engine that turns the LMS's own data into computed signals, and the two-sided AI advisor that explains those signals without ever computing one itself.

## Contents

- [1. The core claim](#1-the-core-claim)
- [2. The analytics data foundation](#2-the-analytics-data-foundation)
- [3. Student insight](#3-student-insight)
- [4. Section insight (faculty view)](#4-section-insight-faculty-view)
- [5. Item analysis](#5-item-analysis)
- [6. Where the numbers surface](#6-where-the-numbers-surface)
- [7. The AI advisor — architecture](#7-the-ai-advisor--architecture)
- [8. The read-only guarantee](#8-the-read-only-guarantee)
- [9. The frontend widget](#9-the-frontend-widget)
- [10. Deployment and operations](#10-deployment-and-operations)
- [11. What a panel will ask](#11-what-a-panel-will-ask)
- [12. Gaps](#12-gaps)

**Related chapters:** [11 — Grading Engine](11-grading-engine.md) · [14 — Pros & Cons](14-assessment-pros-cons.md) · [02 — Auth & RBAC](02-auth-and-rbac.md)

---

## 1. The core claim

> **The database computes every signal. The AI explains and advises. The model never produces an authoritative number.**

This is the thesis argument, and it is architecturally enforced rather than merely intended:

- Every insight number — GWA, risk score, mastery percentage, distance to cum laude — is computed by a PostgreSQL function
- The UI reads those functions directly
- The AI reads **the same functions**, through a single RPC, and is instructed to explain rather than calculate
- Honours cutoffs come from one configurable table (`academic_thresholds`) that grade computation, the insight panel, and the AI all share

The property that follows: **the AI cannot disagree with the transcript**, because both read the same computation. A hallucinated honours projection or a fabricated risk flag would be a defense-ending bug, and the design structurally prevents it rather than prompting against it.

---

## 2. The analytics data foundation

Roadmap item **0.5**, built before any consumer so the schema would never need restructuring.

`docs/sql/learning-analytics-foundation.sql` introduces three tables, each with full RLS (9 policies total):

| Table | Purpose |
|---|---|
| `competencies` | Learning outcomes, tied to courses and programs |
| `assessment_question_competencies` | Tags a question with the competency it measures |
| `competency_alignments` | Links competencies to curriculum structure |

### Graceful granularity degradation

This is the design's cleverest move. Analytics compute at **medium granularity by default** (by assessment type) and **automatically deepen to fine granularity** (by competency) wherever tags exist.

The section insight panel makes this visible: the heading switches between *"Competency Mastery Gaps"* (with the note "computed from competency-tagged questions") and *"Mastery Gaps by Assessment Type"* (with the prompt "tag questions with competencies for finer insight"), driven by a `mastery.granularity` field the RPC returns.

**Consequence:** the system produces useful analytics on day one with zero tagging effort, and gets better as faculty tag questions — with no migration, no restructuring, and no broken state in between. Tagging is progressive, not a prerequisite.

`docs/sql/learning-analytics.sql` — **1,429 lines** — is the engine itself.

---

## 3. Student insight

`fn_get_student_insight(p_student_id, p_term_id)` — resolves the caller's own record when `p_student_id` is null, via the shared `fn_resolve_record_student` gate from [06 §4](06-role-registrar.md).

Rendered by `StudentInsightView` (394 lines), used by **both** the student's own Insight page and the registrar's student-records Insight tab.

**Components:**

| Element | Content |
|---|---|
| Stat tiles | Headline figures |
| `GwaTrendChart` | GWA across terms |
| `MasteryBarList` | Strength/weakness by competency or assessment type |
| Risk badge | High→error, Moderate→warning, Low→success |
| Per-course table | course code, title, `avg_score_pct`, `attendance_rate`, missing count |
| **`TrajectoryCard`s** | One per honour and scholarship target |

### Trajectory cards — the advising payload

Each card shows the target label, its `target_gwa`, an optional tuition `discount_pct`, and exactly one of four states:

| State | Message |
|---|---|
| `is_blocked_by_failing` | "Blocked: a failing grade on record disqualifies this award." |
| `is_currently_qualified` | "On track" |
| `required_avg_on_remaining !== null` | "You need to average X across your remaining units…" |
| otherwise | "Not enough released grades yet to project this target." |

Status badge: **On track** / **Out of reach** (`is_attainable === false`) / **Reachable**.

This is the piece that answers the question navigation cannot: *"Am I on track for cum laude, and what do I need?"* It requires cross-term aggregation, units-weighting, threshold lookup, and a forward projection — none of which any single page could show.

**Everything here reads released grades only**, via `fn_compute_student_gwa`.

---

## 4. Section insight (faculty view)

`fn_get_section_insight(p_section_id)` — rendered by `SectionInsightPanel` as tab 8 of the faculty section detail page.

| Element | Content |
|---|---|
| Four stat tiles | **Enrolled** · **At Risk** (hint: "Risk score 30 or higher") · **Cohort Avg Score** · **Cohort Attendance** (with submission rate) |
| Mastery Gaps | Competency-level or assessment-type-level per §2. Empty label: *"No area is below 75%. The cohort is on track."* |
| Score Distribution | A hand-rolled bar chart over buckets, heights normalised to the max with a 2% floor |
| All Competencies / Types | Full `MasteryBarList` |
| At-Risk Students table | Student No., Name, Avg Score, Attendance, Missing (error-coloured when > 0), Risk score, Level badge |
| Assessment Performance | Assessment, Type, Avg, High, Low, Graded, Submission rate |

Read-only, no actions.

### The two thresholds

| Threshold | Value | Where stated |
|---|---|---|
| **At-risk** | risk score **≥ 30** | `SectionInsightPanel` hint text |
| **Mastery gap** | below **75%** | empty-state copy |

Both are hard-coded, unlike the academic thresholds in §3 which are admin-configurable — see §12.

The at-risk model combines average score, attendance rate, and missing-submission count into a single `risk_score`, computed server-side. The composite is what makes it a *model* rather than a filter, and it is the faculty-side half of the two-sided contribution.

> **Gap** The At-Risk Students table lists **all** students, not only at-risk ones. Only the caption (`{n} of {m} flagged`) counts `is_at_risk`. The heading promises a filtered list and delivers a full roster.

---

## 5. Item analysis

`fn_get_assessment_item_analysis(p_assessment_id)` — classical test theory, computed in the database.

Five tiles: **Submissions, Mean, Median, High, Std Dev**.

Per question: tagged competency chips, a **difficulty badge** (`p={difficulty_index}` — proportion answering correctly), and a **discrimination badge** (`D={discrimination_index}` — how well the item separates high from low performers), each with a server-computed label.

This closes the loop: an item with poor discrimination tells the faculty member the *question* is the problem, not the cohort. It is the teaching-effectiveness signal the roadmap called for, and it is real psychometrics rather than a bar chart.

---

## 6. Where the numbers surface

One engine, six surfaces:

| Surface | Function | Role |
|---|---|---|
| Student Insight page | `fn_get_student_insight` | Student |
| Student dashboard summary card | `fn_get_student_insight` | Student |
| Registrar student-records Insight tab | `fn_get_student_insight` | Registrar |
| Faculty section Insight tab | `fn_get_section_insight` | Faculty |
| Faculty dashboard "Insight Highlights" | `fn_get_faculty_dashboard` | Faculty |
| Dean dashboard `at_risk_sections` | `fn_get_dean_dashboard` | Dean |
| Item analysis page | `fn_get_assessment_item_analysis` | Faculty |
| **The AI advisor** | via `fn_get_assistant_context` | Student, Faculty |

The AI is the eighth consumer of the same engine — not a parallel system.

---

## 7. The AI advisor — architecture

```
 Browser                Supabase Edge Function            PostgreSQL          Google
─────────              ───────────────────────           ────────────        ────────
AiAssistant.tsx
  │ askAssistant()
  ▼
callFunction('ai-assistant', {message, history, activeRole, sectionId, termId})
  │  Authorization: Bearer <caller JWT>
  ▼
                       index.ts
                         │ builds a Supabase client
                         │ from the CALLER's JWT
                         ▼
                       fn_get_assistant_context(role, section, term)
                         │  SECURITY INVOKER · runs as the caller under RLS
                         │                              ▼
                         │                    fn_get_student_insight
                         │                    fn_get_faculty_dashboard
                         │                    fn_get_section_insight
                         ◄──────────── grounded context ─┘
                         │
                         │ + per-role knowledge base (TypeScript modules)
                         ▼
                       gemini.ts ──────────────────────────────────► Gemini Flash
                         ◄────────────── reply ──────────────────────┘
                       { success: true, reply, mode }
```

### Files

| Path | Role |
|---|---|
| `supabase/functions/ai-assistant/index.ts` | Request handler, JWT client, routing |
| `supabase/functions/ai-assistant/gemini.ts` | Gemini call, retry/fallback |
| `supabase/functions/ai-assistant/prompt.ts` | System instruction assembly |
| `supabase/functions/ai-assistant/knowledge/{student,faculty,dean,registrar,admin}.ts` | Per-role how-to knowledge base |
| `supabase/functions/ai-assistant/types.ts` | Shared types |
| `docs/sql/ai-assistant.sql` | `fn_get_assistant_context` |
| `src/services/assistant.service.ts` | The only frontend caller |
| `src/pages/shared/assistant/AiAssistant.tsx` | The widget |

### Three modes, routed by held role

`fn_get_assistant_context(p_active_role, p_section_id, p_term_id)` routes:

| Active role | Mode | Grounding |
|---|---|---|
| Student | `student_advising` | `fn_get_student_insight` — own record only |
| Faculty | `faculty_advising` | `fn_get_faculty_dashboard` + `fn_get_section_insight` when a section is in the URL |
| Admin / Dean / Registrar | `howto` | **none** — knowledge base only |

**If the caller does not actually hold the role they claim, the RPC returns `{success: false, message}` and no model call is made.** The claimed role is checked against held roles, not trusted.

Each nested call is wrapped in `BEGIN … EXCEPTION WHEN OTHERS THEN v_x := NULL; END`, so a failure in one signal degrades to a context-free answer rather than an error.

The knowledge base is authored as **TypeScript modules rather than markdown files** so the deployer bundles it, avoiding runtime file reads.

---

## 8. The read-only guarantee

This is the security argument, and it is worth stating with precision because it is stronger than the usual version.

**The function's Supabase client is built from the caller's `Authorization` header**, so every read runs as the caller under RLS. It is **never** the service-role key. (If it were, `auth.uid()` would be null inside the definer RPCs and the entire argument would collapse.)

**It calls exactly one database function:** `public.fn_get_assistant_context` — `STABLE`, **`SECURITY INVOKER`** (the only invoker function in the reviewed set, which is the correct choice here since it fans out to functions that do their own checks), and `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`.

**No other RPC, table, or storage bucket is reachable from the Edge Function. No mutating statement exists anywhere in the path.**

> **The guarantee is enforced by the surface, not by the prompt.**

That distinction is the whole point. A prompt-based restriction ("do not perform actions") is a request the model may ignore. Here, there is no write RPC exposed for the model to call even if it tried. The AI is *structurally incapable* of enrolling a student, changing a grade, posting an announcement, or reading another student's record — not discouraged from it.

It also preserves §10 single-responsibility: the AI does no role's job. It only surfaces insight the caller could already access through the UI.

`verify_jwt` is enabled on the function, so unauthenticated calls are rejected before the body runs.

---

## 9. The frontend widget

`AiAssistant.tsx` — a floating FAB mounted globally by `ProtectedLayout`, so it is present on **every** authenticated page for **every** role.

**Per-role personality:** each role has its own `ROLE_SUBTITLE`, `ROLE_GREETING`, and three `ROLE_SUGGESTIONS`:
- Admin / Dean / Registrar → pure how-to prompts
- Faculty → *"Which of my students are at risk right now?"*, *"What are my classes struggling with the most?"*, *"How do I grade with a rubric?"*
- Student → honours and GWA prompts

**Context inference:** the current `sectionId` is extracted from the URL by a regex (`/\/sections\/([0-9a-f]{8}-…)/i`). `termId` is **always passed as `null`**.

**History handling:** prior turns are sent with `isFailed` messages filtered out. A failed reply is appended to the transcript flagged `isFailed`.

`callFunction` deliberately **does not toggle the global loading store** — the chat has its own inline "Thinking…" state, and the global spinner would disable every button on screen including the assistant's own send button. This deviation is documented in the function's README.

---

## 10. Deployment and operations

**Prerequisites, in order:**
1. Apply `docs/sql/ai-assistant.sql` to the live database — the function is useless without it
2. `npx supabase login` and `npx supabase link --project-ref <ref>`
3. `npx supabase secrets set GEMINI_API_KEY=<key>`
4. `npx supabase functions deploy ai-assistant`

Local: `npx supabase functions serve ai-assistant --env-file supabase/functions/.env.local`

**Model:** `GEMINI_MODEL` defaults to the `gemini-flash-latest` alias, which Google keeps pointed at the current Flash generation. Pinning a specific id is discouraged — retired ids fail with a 404.

**Retry policy:** the free tier is shared capacity, so 429 and 503 happen. Three attempts — twice on the chosen model, then once on `gemini-flash-lite-latest` (far less contended) — with 0.7 s and 2.0 s backoff. Non-retryable statuses (400, 403, 404) fail immediately rather than wasting the user's time.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the platform. **The Gemini key never reaches the browser** — verifiable by grepping `dist/` after a build.

---

## 11. What a panel will ask

Anticipate these; the answers are all available.

**"How do you know the AI isn't making up the numbers?"**
It cannot produce them. Every figure comes from `fn_get_student_insight` / `fn_get_section_insight`, the same functions the UI reads. Demonstrate by putting the insight page and the chat side by side and asking the same question.

**"What stops it from reading another student's record?"**
The Edge Function builds its client from the caller's JWT and calls one `SECURITY INVOKER` function. Every underlying read resolves the student from `auth.uid()`. Demonstrate by temporarily swapping to the service-role key and showing the reads return empty — that proves the JWT is load-bearing, not decorative. (Revert immediately.)

**"Can it do anything?"**
No write RPC is exposed to it. The tool surface contains exactly one read function.

**"Is this just a chatbot over a FAQ?"**
No — that is the `howto` mode, which is the *safe fallback* for three roles. The contribution is the two advising modes, grounded in computed analytics that answer questions no page answers: cross-term honours projection, composite at-risk scoring, competency mastery gaps.

**"What's your evaluation?"**
⬜ **This is the weak point.** See §12 and [14 §A](14-assessment-pros-cons.md).

---

## 12. Gaps

| # | Gap | Impact |
|---|---|---|
| 1 | ⬜ **No evaluation set for the AI.** The original spec called for ~40 questions with known-correct answers spanning navigation, single-tool lookups, multi-tool aggregation, and **an adversarial refusal set**, reporting tool-selection accuracy, answer correctness, and refusal rate. **None of this exists.** A capstone chatbot with no evaluation is a demo, and the refusal set in particular is what would demonstrate the security property *empirically* rather than only architecturally. It is also the cheapest chapter available. | 🔴 **The biggest thesis gap in the project** |
| 2 | **At-risk (≥30) and mastery-gap (<75%) thresholds are hard-coded**, unlike `academic_thresholds` which is configurable. A panel that notices the inconsistency will ask why one set of cutoffs is institutional policy and the other is a magic number. | 🟠 |
| 3 | **The risk-score formula is not documented anywhere** outside the SQL. There is no written justification for the weighting of score vs attendance vs missing submissions — which is exactly what makes a model defensible rather than arbitrary. | 🟠 |
| 4 | **`p_term_id` is dead from every UI caller** — student insight can only ever show the current term. No historical view. | 🟠 |
| 5 | **`termId` is always null from the AI widget**, so the advisor cannot be asked about a specific past term. | 🟡 |
| 6 | **Competency tagging is presumably unpopulated**, so fine-granularity mastery — the more impressive half of the feature — may never render in a demo. Tagging a single assessment's questions before the defense would materially strengthen it. *(Unverified: I did not query the live data.)* | 🟠 |
| 7 | **At-Risk Students table lists all students**, not only flagged ones | 🟡 |
| 8 | **No export from item analysis or any insight panel** — the strongest evidence in the system is trapped on screen | 🟡 |
| 9 | **Chat history is client-side only.** `assistant_conversations` / `assistant_messages` tables were specced as optional and not built, so nothing is available for post-hoc analysis of what users actually asked — which would have been useful evaluation data. | 🟡 |
| 10 | **Item analysis is not exposed to the AI.** `fn_get_assistant_context` grounds faculty mode on the dashboard and section insight but not on item analysis, so the advisor cannot discuss which *questions* were badly written. | 🟡 |
