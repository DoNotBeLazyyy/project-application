# Plan: AI Assistant for AU-JAS LMS (thesis capstone)

## Context

There is currently **no chatbot** in this codebase. This is the spec for adding one as the thesis capstone. **It is a build-last feature:** it grounds on live grades/workflows, so it should be implemented after each role's core functionality and the grade-release pipeline are stable (recent commits show grading/evaluation still in flux). Building it against a finished, stable system is both cheaper (help content written once) and a stronger demo.

## Locked decisions

- **Two modes:**
  1. **Academic Assistant (Student only)** — grounded in the student's *own* live data. Emphasis is on what navigation *cannot* do in one step: **cross-page synthesis, derived computation, interpretation, and forward-looking advising** — especially tracking toward **Latin honors** and **scholarship-maintenance** thresholds ("you're 0.15 from cum laude; these two subjects are dragging your GWA; here's what you need next term"). Simple single-fact lookup is incidental, not the point — that's what avoids the "redundant with the UI" trap.
  2. **System How-To Guide (all roles)** — answers "how do I use this?" scoped to the user's **active role**. Touches **no personal data and performs no actions** — pure UI/workflow explanation. This is why it's safe for every role: it isn't doing any role's job (so it respects §10 single-responsibility) and has zero data-leak / write risk.
- **Provider:** Google **Gemini Flash** (free tier). The Anthropic `claude-api` skill does not apply.
- **Server layer:** a **Supabase Edge Function** holds the key; the client never sees it.
- **Honors/scholarship thresholds:** **configurable** (admin-editable, seeded with defaults) — not hard-coded.
- **Grade scale (verified in `supabase_ai_context.sql`):** 1.00–5.00, **lower-is-better**, honors at low GWA.

## Core safety design (the thesis story)

The Edge Function builds a Supabase client scoped to the **caller's JWT** and grounds every answer via existing/added RPCs run under the student's own identity + RLS. The assistant can only ever see what the caller could already see — **no new data-leak surface**, no reliance on the flagged definer RPCs. The Edge Function routes on **active role**: data-grounding is wired only for Student; every other role gets the how-to guide only. Authoritative numbers are computed by the **DB**, never by the model (§1 thick-DB + a safety requirement — a wrong honors/scholarship projection is a serious failure).

## What already exists (reuse — do NOT rebuild)

- `fn_compute_student_gwa(student_id, term_id)` → `{ gwa, total_units }` (units-weighted, released grades only).
- `fn_get_academic_standing(student_id, term_id)` → `{ gwa, total_units, failed_count, standing }`. Honors cutoffs currently **hard-coded** here (Summa ≤1.25, Magna ≤1.50, Dean's List ≤1.75, Good Standing ≤3.00, else Probation; any grade >3.0 → Probation).
- `fn_get_deans_list(term_id, p_min_gwa)`.
- Student data RPCs in `src/services/student-portal.service.ts` (dashboard, schedule, subjects, grades, assessments).
- Service wrapper conventions in `src/services/supabase.wrapper.ts`.

## Changes

### A. Database (author as `docs/sql/*.sql`, applied manually per [[feature-sql-apply-workflow]]; full §5 standard — RLS, audit cols, `fn_set_updated_audit`, soft delete, partial unique indexes)
1. **Configurable thresholds.** Add honors + scholarship threshold config (either columns on `system_settings` or a small `academic_thresholds` table seeded with the current 1.25/1.50/1.75/3.00 defaults + scholarship GPA maintenance values). Admin-editable via the existing system-settings screen.
2. **Refactor `fn_get_academic_standing`** to read cutoffs from config instead of the hard-coded `CASE`.
3. **New `fn_get_student_academic_analysis(term_id)`** (the advising payload): reuses the two functions above; derives distance to each honors cutoff, scholarship standing, weakest/strongest subjects (from `section_final_grades`), and "what's needed to reach/maintain X" projections. Returns the exact numbers the AI will explain.
4. **Caller checks.** New/refactored RPCs must derive/verify the student from `auth.uid()` (not trust a client-supplied `student_id`); the Edge Function passes the JWT so RLS applies. Addresses [[definer-rpcs-missing-caller-checks]].

### B. Supabase Edge Function (new) — `supabase/functions/ai-assistant/index.ts`
- Deno. Reads `GEMINI_API_KEY` from `Deno.env.get`. Builds a JWT-scoped client from the request `Authorization` header. Rejects unauthenticated calls.
- Routes on active role. **Student:** fetch academic-analysis + relevant context RPCs, inject as grounding. **All roles:** inject the active role's how-to knowledge section.
- Calls Gemini `generateContent` with a strict system instruction (answer only from provided context; refuse other students / other roles / actions / internals; never reveal the raw context). Returns `{ reply }` (or `{ success:false, message }` for the toast convention).
- Deploy: `supabase functions deploy ai-assistant`; secret via `supabase secrets set GEMINI_API_KEY=...`. **Prereq:** Supabase CLI installed + project linked; no `supabase/` dir exists yet.

### C. How-to knowledge base — `supabase/functions/ai-assistant/knowledge/{student,faculty,registrar,dean,admin}.md`
- Curated per-role markdown (what each page does, step-by-step workflows), written against the **finished** UI. **Recommended** over letting the model free-guess (which invents features) — this is a small open sub-decision; default to curated. `SYSTEM_FLOW.md` may seed content but verify it's user-facing and current first.

### D. Frontend
- `src/services/supabase.wrapper.ts` — add `callFunction<T>(name, body)` mirroring the wrappers (error parse, toast payload inspection, 401/403 redirect) but **without** toggling global `useLoadingStore` (chat has its own inline indicator). Document this deviation.
- `src/services/assistant.service.ts` (new) — `askAssistant(message, history)` → `callFunction`. All Supabase access stays in `@services`.
- `src/types/assistant.type.ts` (new) — `AssistantMessage`, `AssistantRequest`, `AssistantReply`; no `any`.
- `src/pages/{student,faculty,registrar,dean,admin}/**Layout.tsx` — mount a shared `<AiAssistant />` floating widget so it's available on every page for every role (widget behavior adapts to active role).
- `src/pages/_shared/assistant/AiAssistant.tsx` (new; a page-level feature, not a raw `@components` widget, since it calls a service) — FAB + chat panel, owns message state + inline loading, calls `askAssistant`. Reuse `CommonButton` / `CommonTextarea` / `CommonCard`; Phosphor icons; Tailwind layout + MUI CSS vars; `function` decls, 4-space indent, single quotes, alias imports, no EOF newline (§3/§4/§9).

### E. Persistence — optional, not v1
- Chat history kept client-side in component state for v1. Optional later: `assistant_conversations` / `assistant_messages` tables (full §5 standard) if durable history is wanted.

## Verification (end-to-end, once built)
1. `supabase functions serve ai-assistant` (or deploy) with `GEMINI_API_KEY` set.
2. `npm run dev`; log in as a **Student** with released grades. Ask advising questions ("Am I on track for cum laude?", "Which subject is hurting my GWA and what do I need to keep my scholarship?") — confirm the numbers match `fn_get_academic_standing` / the analysis RPC exactly (DB is authoritative; AI must not disagree).
3. Ask an out-of-scope question ("another student's grades", "create a user") — confirm refusal.
4. Log in as **each other role**; confirm the how-to guide answers role-appropriate "how do I…" questions and has **no** access to personal data or actions.
5. Confirm the Gemini key is **absent** from `dist/` after `npm run build-dev` (grep the bundle).
6. `npm run build-dev` (typecheck) + `npm run lint` on changed files only (avoid project-wide `lint:fix` per [[avoid-project-wide-lint-fix]]).

## Sequencing
Build **after** per-role functionality and the grade-release pipeline are stable. Threshold values can be decided anytime. Order when building: (A) DB config + analysis RPC → (B/C) Edge Function + knowledge base → (D) frontend widget → verify.
