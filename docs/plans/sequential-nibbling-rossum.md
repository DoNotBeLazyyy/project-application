# Special Grade Configs — Uniqueness + Field Investigation

## Context
The Special Grades tab (Admin → Grading Configuration) lets admins define special grade marks (INC, FDA, DROP, etc.). Today only `code` is uniquely constrained (`uidx_special_grade_configs_code`, case-sensitive). The user wants `label` and `description` to also be unique so two special grades can't share the same human-readable name or description. Uniqueness must be **case-insensitive + trimmed** (matching the existing grading-period-template validation pattern), `description` stays **optional** and is only unique when non-empty.

Separately, the user asked for a brief investigation of whether the form fields are sufficient to describe special-grade situations. **Decision: report findings only — no field changes in this task.**

## Investigation Findings (report only, no code changes)
The current fields define the three canonical cases adequately:
- **INC** → `requires_completion` + `completion_deadline_days` + `is_passing=false`
- **FDA** → `min_absence_percentage` threshold + `is_passing=false`
- **DROP** → marker + `is_passing=false`

Gaps to revisit later (not implemented now):
1. **No numeric grade equivalent.** Special marks usually resolve to a number (INC→4.00, DRP→5.00) or "exclude from GWA." `section_final_grades.special_grade` is free `text` and **not linked** to `special_grade_configs` — the config table is currently a standalone reference not consumed by any grade computation.
2. **`is_passing` conflates "fails" vs "excluded from GWA."** DROP is typically excluded, not failing; one boolean can't express that.
3. **No auto-apply vs manual flag.** FDA should auto-trigger from `min_absence_percentage`; DROP is manual. Nothing distinguishes them and nothing yet consumes `min_absence_percentage`.

These are noted for a future enhancement; this task does not change fields.

## Changes

### 1. SQL — new file `docs/sql/special-grade-configs-unique.sql`
Follows the repo convention (SQL scripts live in `docs/sql/`, applied manually; `supabase_ai_context.sql` is a generated dump, never hand-edited). No SQL comments (§6).

**Partial unique indexes** (case-insensitive, trimmed, soft-delete aware; §5). Replace the existing case-sensitive code index and add label + description:
```sql
DROP INDEX IF EXISTS public.uidx_special_grade_configs_code;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_code
    ON public.special_grade_configs (lower(btrim(code)))
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_label
    ON public.special_grade_configs (lower(btrim(label)))
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_description
    ON public.special_grade_configs (lower(btrim(description)))
    WHERE deleted_at IS NULL AND btrim(coalesce(description, '')) <> '';
```

**Rewrite `fn_save_special_grade_configs(jsonb)`** (`CREATE OR REPLACE`) to validate before writing and return the `{success, message}` shape that `callRpc` turns into a toast. Mirror the validation style in `docs/sql/grading-period-template-crud.sql` (`fn_create_grading_period_template`). Order:
1. **In-batch duplicate checks** (case-insensitive, trimmed): compare `COUNT(DISTINCT lower(btrim(c->>'code')))` to `jsonb_array_length` for `code` and `label`; for `description` do the same but only over elements with non-empty description. Return a friendly message on collision, e.g. `Duplicate special grade code "INC" in your changes.`
2. **Against existing rows** (per element, `deleted_at IS NULL`, excluding self by `id`): for `code`, `label`, and non-empty `description`, `EXISTS` check → return e.g. `A special grade with label "Incomplete" already exists.`
3. **Upsert** as today, but store trimmed values (`btrim(...)`) for `code`/`label`/`description`; keep numeric/boolean casts unchanged.

The `fn_delete_special_grade_config` and `fn_get_special_grade_configs` functions are unchanged.

### 2. Frontend — no changes required
Server-side validation messages surface automatically via `callRpc` (`saveSpecialGradeConfigs` in `src/services/grading-config.service.ts` already routes through it). Types in `src/types/grading-config.type.ts` and the form in `SpecialGradeItem.tsx` stay as-is. The save handler in `src/pages/admin/grading-config-management/index.tsx` (`handleSaveSpecial`) already re-reads nothing after save, so a rejected save leaves in-memory edits intact for correction — acceptable.

## Files
- **New:** `docs/sql/special-grade-configs-unique.sql`
- **DB (via that script):** `special_grade_configs` indexes + `fn_save_special_grade_configs`
- After applying to the DB, regenerate `supabase_ai_context.sql` via `pg_dump` (manual, outside this repo's build).

## Verification
1. Apply `docs/sql/special-grade-configs-unique.sql` to the Supabase DB.
2. `npm run dev`, go to Admin → Grading Configuration → Special Grades.
3. Add two rows with the same code (try `INC` and `inc `) → Save → expect an error toast, no write.
4. Repeat for duplicate `label`, then duplicate non-empty `description`.
5. Two rows with **blank** descriptions → Save succeeds (blank not enforced).
6. Distinct code/label/description → Save succeeds and persists after tab reload.
7. Confirm no regression: existing rows still load and edit normally.
