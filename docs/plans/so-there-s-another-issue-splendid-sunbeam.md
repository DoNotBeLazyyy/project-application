# Enforce 100% Total Cap on Grading Period Templates

## Context

`grading_period_templates` is a **single, global, unscoped** set of default grading periods (Prelim, Midterm, Pre-Finals, Finals…) applied generally across all programs and year levels. Confirmed against the schema: the table has **no** `program_id` / `program_level_id` / `term_id` / `school_year_id` column (`supabase_ai_context.sql:11198-11210`), and a unique index on `sequence` reinforces a single ordered global list. The scoped runtime instances live in separate tables (`grading_periods.term_id`, `grading_components.section_id`).

Because a term's final grade is a weighted average across these periods, the set **must total exactly 100%** and must never exceed it. The original batch RPC `fn_save_grading_period_templates` enforced this hard. The recent refactor to single-record CRUD (`fn_create/update/delete_grading_period_template`) preserved per-period component validation but **dropped the cross-period cap**, so periods can now be created past 100% (observed: adding 25% on top of 100% → 125%). This is a regression to fix on both backend and frontend.

**Goal:** Prevent the cumulative weight of all grading period templates from ever exceeding 100% — enforced in the database (authoritative) and prevented in the UI (fast feedback). Partial totals (e.g. 25/50/75) remain valid intermediate states while building the set up to 100%.

## Rule

- After any create/update, `SUM(weight of all non-deleted period templates) <= 100`.
- Create: `existing_total + p_weight <= 100`; if `existing_total >= 100`, block as "limit reached."
- Update: `total_of_others (excluding this id) + p_weight <= 100`.
- Delete is always allowed (it is the recovery path for existing over-100 data).

## Changes

### 1. Backend — `docs/sql/grading-period-template-crud.sql` (authoritative guard)

In `fn_create_grading_period_template`, after the existing name/weight/component checks and before the INSERT, add:
- Compute `v_existing_total := COALESCE(SUM(weight),0) FROM public.grading_period_templates WHERE deleted_at IS NULL`.
- If `v_existing_total >= 100` → return `{success:false, message:'Grading periods already total 100%. You cannot add another period.'}`.
- If `v_existing_total + p_weight > 100` → return `{success:false, message:'Adding this period (' || p_weight || '%) would exceed 100%. Only ' || (100 - v_existing_total) || '% remaining.'}`.

In `fn_update_grading_period_template`, after the existing checks and before the UPDATE, add:
- Compute `v_others_total := COALESCE(SUM(weight),0) FROM public.grading_period_templates WHERE deleted_at IS NULL AND id <> p_id`.
- If `v_others_total + p_weight > 100` → return `{success:false, message:'This weight would make the total exceed 100%. Only ' || (100 - v_others_total) || '% is available for this period.'}`.

Follow existing file conventions (no SQL comments, `CREATE OR REPLACE`, `SECURITY DEFINER`, `jsonb_build_object` returns). Re-run the whole file in Supabase SQL Editor after editing.

### 2. Frontend — `src/pages/admin/grading-config-management/PeriodsTab.tsx` (prevent + alert)

- `periodWeightTotal` is already computed (line ~65). Intercept the create action: change the `onCreate` handler so that when `periodWeightTotal >= 100`, it calls `useToastStore.getState().showToast('Grading periods already total 100%. You cannot add another period.', 'warning')` and returns **without** opening the create modal. Otherwise open as normal.
  - `useToastStore` from `@stores/toast.store` — API `showToast(message, variant)`. PeriodsTab is a page-level component (`@pages`), so reading/using the toast store here is allowed (the §7 store restriction applies to reusable `@components`, and the wrapper already uses this exact store).
- Pass the remaining allowance into the create form so the weight field cannot be set past it: compute `remainingWeight = Math.max(0, 100 - periodWeightTotal)` and hand it to `PeriodModalForm` for the create modal only (the update modal should allow up to `100 - othersTotal`, but for simplicity cap the create path; update is still guarded by the backend + shows the backend toast).

### 3. Frontend (optional polish) — cap the weight input

Thread an optional `maxWeight?: number` from `PeriodModalForm` → `PeriodForm` (`src/pages/admin/grading-config-management/PeriodModalForm.tsx`, `PeriodForm.tsx`). When provided, set the `weight` field's `fieldProps.max` and the `max` validation rule to `maxWeight` instead of the hardcoded `100`. Default remains `100` when not provided, so existing behavior is unchanged. This gives inline validation for the partial case (e.g. total 75 → weight field max 25).

## Notes / expected behavior

- Existing test data currently totals ~150% (six periods incl. a duplicate "Prelim" and a "TEst"). After this change, create/update will be blocked until the total is brought to ≤100% by **deleting** the surplus/test periods (delete is intentionally never weight-blocked). This is the intended cleanup path.
- The cross-period total hint in the header can stay as "should equal 100%" (soft completeness guidance); the hard cap is the new ≤100% enforcement.

## Verification

1. Apply the updated SQL in Supabase SQL Editor (paste `docs/sql/grading-period-template-crud.sql`).
2. `npm run build-dev` restricted to sanity (pre-existing unrelated errors on this branch are expected); confirm no new errors in the changed files. Run `npm run lint` / `lint:fix` on the changed files.
3. Run `npm run dev` and on the Admin → Grading Configuration → Periods tab:
   - Delete surplus periods until total = 100%. Confirm the **Create** button now shows the warning toast and does **not** open the modal.
   - Delete one period (e.g. total → 75%). Confirm Create opens; the weight field max is 25; entering 30 is rejected client-side, and if forced, the backend returns the "would exceed 100%" toast.
   - Create a valid 25% period → total returns to 100%, row appears, create blocked again.
   - Edit an existing period's weight upward past the remaining allowance → backend blocks with the "exceed 100%" toast; a valid change succeeds.
