# LMS Guide Chatbot — Implementation Plan

## Context

This is a capstone requirement, not a product need discovered from user pain. That is fine, and it should shape the design: the bot must be **demonstrable, defensible under panel questioning, cheap, and narrow enough that it never fails on stage**. Real-world coverage is not the bar. "It declined because it couldn't verify that" is a good demo moment; "it invented a grade" ends the defense.

Decided during the grilling interview:

- **Audience:** students only, hard stop.
- **Purpose:** a navigation/guidance assistant. It explains how to do things and points at the right page. Data access is read-only and secondary.
- **Never writes.** Its tool registry contains only `fn_get_*` / `fn_list_*` reads.
- **Runtime:** a Supabase Edge Function. The Anthropic key cannot live in the browser (Vite inlines `VITE_*` into the bundle).
- **Staged:** Phase 1 = tool-calling over existing definer RPCs. Phase 2 = pgvector RAG over `course_materials`, if time allows.

The defensible property, and the whole reason this design works: **every tool the bot can call resolves the caller's identity from `auth.uid()` inside Postgres.** The bot is structurally incapable of reading another student's record, not merely discouraged from it. This is not a mitigation — it's an invariant.

---

## Phase 0 — Fix the authorization hole first (blocking)

**Independent of the chatbot, this is a live vulnerability.**

`fn_list_grade_sheet(p_section_id, p_grading_period_id)` and `fn_list_section_students(p_section_id, …)` in `supabase_ai_context.sql` are `SECURITY DEFINER`, contain zero `auth.uid()` references, and have no `faculty_id` predicate. `SECURITY DEFINER` bypasses RLS, and Postgres grants `EXECUTE` to `PUBLIC` by default — the dump contains **zero** `REVOKE` statements. Any authenticated user, including a Student, can call these from the browser console with an arbitrary `section_id` and read a whole class's grades.

Compare the functions that get it right:
- `fn_get_subject_detail` → `WHERE e.id = p_enrollment_id AND e.student_id = v_student_id`, returns `'Enrollment not found or access denied.'` otherwise.
- `fn_get_section_detail` → `AND s.faculty_id = auth.uid()`.

Do not build a natural-language front door onto RPCs that don't check the caller. Two actions, in a new `docs/sql/rpc-authorization-hardening.sql` (see [[feature-sql-apply-workflow]] — these are authored as files and applied to live Supabase by hand):

1. Add a caller predicate to every faculty/registrar/dean `SECURITY DEFINER` function that currently lacks one. Audit all ~200 `fn_*` for `auth.uid()` presence; the two named above are confirmed, there are likely more.
2. Add a reusable guard helper (`fn_require_role(p_role text)`) since no role-check function exists today — grep confirms no `fn_has_role` / `fn_current_user_roles`.

This is worth a slide in the defense on its own. "I found and fixed a cross-student grade leak while threat-modeling the assistant" is a stronger result than the chatbot.

---

## Phase 1 — The guide bot

### What it does

Two capabilities, in priority order:

**1. Navigation & guidance (the primary purpose).** Grounded in an authored **capability map** — a static document describing the student routes, what each page does, and how to accomplish common tasks. Because the bot is student-only, the map only ever describes student routes. Role scoping becomes a non-problem rather than a prompt-injection surface.

The map is derived from `src/routes/student/` and the pages under `src/pages/student/`. Write it by hand; it's a few pages of prose. Do **not** generate it at runtime — a static prefix is what makes prompt caching possible.

**2. Read-only record lookups.** Six tools, each a thin wrapper over an existing definer RPC:

| Tool | RPC | Args |
|---|---|---|
| `get_my_schedule` | `fn_get_student_schedule` | none |
| `get_my_dashboard` | `fn_get_student_dashboard` | none |
| `list_my_subjects` | `fn_list_my_subjects` | page, size, search |
| `list_my_grades` | `fn_list_my_grades` | page, size, term_id |
| `get_subject_detail` | `fn_get_subject_detail` | enrollment_id |
| `get_subject_grades` | `fn_get_subject_grades` | enrollment_id |

Note the shape: four of the six take **no identifying argument at all** — the RPC resolves `students.id` from `auth.uid()` itself. The two that take an `enrollment_id` verify ownership internally and return an access-denied payload otherwise. A hallucinated UUID gets a refusal, not someone else's data.

Lead the demo with the queries no page answers: *"am I at risk of failing anything?"* (grades × component weights × transmutation table) and *"what's due this week across all my subjects?"* (spans every enrolled section). Avoid demoing *"what's my grade in X"* — the grades page already answers that better, and a panelist will say so.

### Where it runs

No `supabase/` directory exists yet, so Phase 1 includes scaffolding one.

```
supabase/functions/chat/index.ts     Deno; Anthropic tool-use loop; SSE out
```

The function:
1. Reads the `Authorization` header off the incoming request.
2. Constructs a Supabase client **bound to that JWT** — never the service-role key. If it used service role, `auth.uid()` is null inside the definer RPCs and the whole security argument collapses.
3. Runs the Anthropic tool-use loop. Each tool call becomes a `supabase.rpc(...)` on that JWT-bound client.
4. Streams the assistant text back as SSE.

`ANTHROPIC_API_KEY` lives in Supabase function secrets.

### Model, cost, and caching

Use **`claude-opus-4-8`** (`$5 / $25` per MTok in/out). For a capstone with a handful of demo conversations, total inference cost is dollars, not hundreds. If you decide the cost matters more than answer quality, `claude-haiku-4-5` ($1 / $5) is the deliberate downgrade — that's your call, not a default I should make for you.

Settings:
- `output_config: { effort: "low" }` — this is routing and lookup, not reasoning. Low effort means fewer, more consolidated tool calls and terser answers.
- Omit `thinking` entirely. On Opus 4.8, omitting it runs *without* thinking (adaptive is not the default when the field is absent), which is what you want for a low-latency guide.
- `max_tokens: 4096`.

**A caching trap worth knowing before you write the code:** the minimum cacheable prefix on Opus 4.8 is **4096 tokens**. A short system prompt plus six tool definitions will land well under that, and `cache_control` will *silently* fail — no error, just `cache_creation_input_tokens: 0` forever. Either the capability map is substantial enough to cross 4096 tokens (likely, if it genuinely documents every student page), or you skip caching and don't pretend it's working. Verify with `response.usage.cache_read_input_tokens` on the second request; if it's zero, the prefix is too short or something volatile leaked into it. Never interpolate a timestamp or the student's name into the system prompt — that invalidates the whole prefix on every request.

Order matters: `tools` → `system` → `messages`. Put `cache_control` on the last system block; it caches tools and system together.

### Frontend

- `src/services/chat.service.ts` — the only file that talks to the function. Per CLAUDE.md §1, all Supabase calls live in `@services`.
- It cannot use `callRpc` from [supabase.wrapper.ts](src/services/supabase.wrapper.ts): that wrapper toggles the global blocking spinner via `useLoadingStore`, which is wrong for a streaming chat. Use `fetch` against the function URL with `Authorization: Bearer <session.access_token>` read from `useAppStore`, and consume the SSE body.
- UI: a `CommonModal`-hosted panel, launched from `CommonNavbar`. Rendered only when `activeRole === 'Student'`. Follow §9 — plain HTML plus Tailwind for the transcript, `CommonInput` for the composer, no `<Box>`/`<Typography>`.

### Guardrails in the system prompt

- Answer only from tool results and the capability map. If neither covers it, say so and point at the page.
- Never state a grade, score, or date that did not come from a tool result verbatim.
- Never claim to have performed an action; you cannot act. Direct the student to the page.

---

## Phase 2 — Course-materials RAG (only if Phase 1 lands early)

Nothing in the schema supports this yet: no `vector` extension, no `tsvector`, no embedding column. Search today is `ILIKE '%…%'`.

Sketch: enable `pgvector`; add `course_material_chunks (material_id, chunk_index, content, embedding vector(1024))` with the six audit columns, RLS, and a partial unique index per §5; a `fn_search_my_materials(p_query_embedding)` that joins through `enrollments` to `auth.uid()` so a student only ever retrieves from sections they're enrolled in; extraction of `course_materials.file_url` PDFs into chunks.

Two things a panel will ask, so decide them now: **prompt injection** (a lecturer's PDF is untrusted input to the model — it must not be able to instruct the bot) and **citation** (every claim traces to a chunk, or the bot declines).

If Phase 1 ships and Phase 2 doesn't, you still defend a complete system. That's why the order is this way.

---

## Evaluation (do not skip — this is what makes it a thesis)

A capstone chatbot with no evaluation is a demo. Build a fixed set of ~40 student questions with known-correct answers drawn from seeded test data, spanning: navigation questions, single-tool lookups, multi-tool aggregations, and **questions the bot should refuse** (another student's grades, anything requiring a write, anything outside the corpus).

Report three numbers: tool-selection accuracy, answer correctness, and refusal rate on the adversarial set. The refusal set is the one that demonstrates the security property empirically rather than architecturally, and it's the cheapest chapter you'll write.

---

## Verification

1. **The security property, directly.** Log in as Student A. In the browser console, call `supabase.rpc('fn_get_subject_detail', { p_enrollment_id: '<Student B enrollment uuid>' })`. Confirm it returns `access denied`. Then ask the bot, in plain English, for that same enrollment ID. Confirm the tool call is made and the RPC refuses. Screenshot both — that pair is your security slide.
2. **The Phase 0 fix.** Same shape against `fn_list_grade_sheet` with an arbitrary `section_id`, before and after the hardening SQL. Before: rows. After: refusal.
3. **JWT forwarding.** Temporarily swap the Edge Function's client to the service-role key and confirm the definer RPCs return empty/deny. This proves the JWT is load-bearing, not decorative. Revert immediately.
4. **Caching.** Log `usage.cache_read_input_tokens` across two consecutive turns. Zero means the prefix is under 4096 tokens or something volatile is in it.
5. `npm run build-dev` (this is the typecheck — `tsc -b` runs first). Then `npm run dev` and drive the chat panel as a student.
