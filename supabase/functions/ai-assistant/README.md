# ai-assistant Edge Function

The two-sided, read-only AI advisor. Google Gemini Flash is called from this function only; the API
key never reaches the browser.

## Data surface

The function's Supabase client is built from the caller's `Authorization` header, so every read runs
as the caller under RLS. It calls exactly **one** database function:

- `public.fn_get_assistant_context(p_active_role, p_section_id, p_term_id)` — `STABLE`,
  `SECURITY INVOKER`, revoked from `anon`.

No other RPC, table, or storage bucket is reachable from here, and no mutating statement exists in the
path. That is the whole read-only guarantee: it is enforced by the surface, not by the prompt.

Routing inside that RPC, by the caller's held active role:

| Active role | Mode | Grounding |
|---|---|---|
| Student | `student_advising` | `fn_get_student_insight` (own record) |
| Faculty | `faculty_advising` | `fn_get_faculty_dashboard` + `fn_get_section_insight` when a section is in the URL |
| Admin / Dean / Registrar | `howto` | none — knowledge base only |

If the caller does not hold the role they claim, the RPC returns `{ success: false, message }` and no
model call is made.

## Prerequisites

1. Apply `docs/sql/ai-assistant.sql` to the live database first — the function is useless without it.
2. Supabase CLI linked to the project:
   ```
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```
3. A Gemini API key from Google AI Studio.

## Secrets

```
npx supabase secrets set GEMINI_API_KEY=<key>
```

`GEMINI_MODEL` is optional and defaults to the `gemini-flash-latest` alias, which Google keeps
pointed at the current Flash generation. Pin a specific model only if you need reproducibility —
pinned Gemini model ids are retired for new callers over time, and a retired id fails with a 404
whose text appears in the `detail` field of the error response and in the function logs.
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the platform.

The free tier is shared capacity, so 429 and 503 responses happen. Three attempts are made —
twice on the chosen model, then once on `gemini-flash-lite-latest`, which is far less contended —
with 0.7s and 2.0s backoff. Non-retryable statuses (400, 403, 404) fail immediately, because
retrying a misconfiguration only wastes the user's time.

## Run locally

```
npx supabase functions serve ai-assistant --env-file supabase/functions/.env.local
```

`.env.local` holds `GEMINI_API_KEY=...` and is not committed.

## Deploy

```
npx supabase functions deploy ai-assistant
```

`verify_jwt` is on, so unauthenticated calls are rejected before the function body runs.

## Request and response

```jsonc
// POST /functions/v1/ai-assistant
{
  "message": "Am I on track for cum laude?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "activeRole": "Student",
  "sectionId": null,
  "termId": null
}
```

```jsonc
{ "success": true, "reply": "...", "mode": "student_advising" }
```

Failures return `{ "success": false, "message": "..." }` with a non-2xx status. The frontend reads
these through `callFunction` in `src/services/supabase.wrapper.ts`, which surfaces `message` as an
error toast and redirects to `/login` on 401/403.

## Deviations from the house conventions

- `callFunction` deliberately does **not** toggle `useLoadingStore`. The chat has its own inline
  "Thinking..." state, and the global spinner disables every `CommonButton` on screen — including the
  assistant's own send button.
- The knowledge base is authored as TypeScript modules rather than `.md` files so that it is bundled
  by the deployer rather than depending on runtime file reads.
