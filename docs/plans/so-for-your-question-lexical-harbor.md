# Fix: error focus jumps to wrong tab in Non-Holiday Pay Rate premium rates

## Context

The Non-Holiday Pay Rate form's "Premium Rates" step (`PremiumRatesField.tsx`) shows two tables — Working Day rates and Rest Day rates — as tabs, only one rendered at a time (`{activeTab === 0 && <WorkingTable/>}` / `{activeTab === 1 && <RestTable/>}`). Both arrays live under a single `react-hook-form` control (`NonHolidayPayRatePremiumDTO`).

Reported bug: when the user is on the **Rest Day** tab and submits with validation errors on **both** arrays, focus lands on a **Working Day** input instead of the visible Rest Day input.

Root cause: `useForm()` is called without `shouldFocusError: false` anywhere in this codebase (confirmed via grep — `react-hook-form@^7.71.2`), so RHF's default built-in auto-focus is active. That default focuses fields in **registration order**, not visual/tab order — `workingDayRates` fields register first (mounted on tab 0 by default), so RHF's own auto-focus reaches for them regardless of which tab is actually visible. `NonHolidayPayRateCreate.tsx`'s hand-rolled `onError` (lines 93-104) only decides whether to *switch tabs*, and runs *after* RHF's internal auto-focus has already fired — it can't prevent the wrong-tab focus from happening first. `NonHolidayPayRateUpdate.tsx` has no `onError` at all, so it's fully exposed to the same default behavior.

There's already dead scaffolding for exactly this feature: `PremiumRatesField.tsx` declares a `PremiumRatesFieldHandle` interface with a `focusErrorTab` method (documented as "respecting current-tab priority") that is never implemented or consumed anywhere. This plan finishes that intent, but as a self-contained reactive mechanism inside `PremiumRatesField` rather than an imperative ref handle, so both Create and Update — which both render `PremiumRatesField` via the shared `NonHolidayPayRateForm` — get correct behavior with one implementation. (Confirmed with the user: Update currently has zero tab-priority logic at all, so inheriting this fix is a strict improvement, not a regression risk.)

## Approach

1. **Disable RHF's untrustworthy default auto-focus** for the premium-rates form only, and drive focus explicitly ourselves instead.
   - Add an optional `shouldFocusError` param (default `true`, preserving current behavior everywhere else) to `useCreateForm` (`src/hooks/common/form/use-create-form.tsx`) and `useUpdateForm` (`src/hooks/common/form/use-update-form.tsx`), forwarded into their internal `useForm({ defaultValues, shouldFocusError })`.
   - In `NonHolidayPayRateCreate.tsx` and `NonHolidayPayRateUpdate.tsx`, pass `shouldFocusError: false` when constructing `controlPremium` (the premium-rates `useForm` instance only — leave the country-details `useForm` untouched).
   - Both hooks must also return `setFocus` from their internal `useForm()` (currently not returned) — needed by step 2.

2. **Thread `setFocus` down to `PremiumRatesField`**, alongside the existing `control` prop:
   - `NonHolidayPayRateForm.tsx`: add a `setFocusPremium: UseFormSetFocus<NonHolidayPayRatePremiumDTO>` prop, pass to `<PremiumRatesField setFocus={setFocusPremium} .../>`.
   - `NonHolidayPayRateCreate.tsx` / `NonHolidayPayRateUpdate.tsx`: pass `setFocus` from their respective `useCreateForm`/`useUpdateForm` premium instances into the new prop.

3. **Implement the focus logic inside `PremiumRatesField.tsx`** (self-contained, reactive — no ref/imperative handle needed, so remove the dead `PremiumRatesFieldHandle` interface):
   - Use `useFormState({ control })` to get `errors` and `submitCount`.
   - `useEffect` keyed on `submitCount` (skip the initial `0`) — **not** on `errors` — so this only fires on an actual submit attempt, not on every keystroke's revalidation:
     - Determine the active array name (`activeTab === 0 ? 'workingDayRates' : 'restDayRates'`) and the inactive one.
     - Read latest `errors` via a ref updated every render (avoid stale-closure issues without adding `errors` as an effect dependency).
     - If the **active** array has any row error → find the first errored field in **row order, then fixed column order** (`rateType`, `rateValue`, `fromHours`, `toHours`) and call `setFocus('<arrayName>.<rowIndex>.<column>')`.
     - Else if the **inactive** array has errors → `setActiveTab(otherTab)`, then focus once the newly active tab's table has actually rendered (see step 4), targeting the same first-errored-field logic against the now-active array.
   - Small helper (local to this file): `findFirstErrorFieldPath(arrayName, rowErrors: FieldErrors<PayRatesDTO>[] | undefined): Path<NonHolidayPayRatePremiumDTO> | undefined`, walking rows then the fixed column order above.

4. **Timing the post-switch focus**: `PremiumRatesTable` remounts its `AgGridReact` instance on tab switch (conditional render + `key`), so the input ref isn't available immediately after `setActiveTab`. Use ag-grid's `onFirstDataRendered` callback (already passed through untouched via `CommonTable`'s `{...props}` spread — confirmed in `CommonTable.tsx`) as the reliable "now mounted" signal, rather than a guessed `requestAnimationFrame` delay: thread an optional `onFirstDataRendered` prop from `PremiumRatesField` down through `PremiumRatesTable` into `CommonTable`, and use it to fire the deferred `setFocus` call for the pending cross-tab focus target.

## Files to change

- `src/hooks/common/form/use-create-form.tsx` — add `shouldFocusError` param, return `setFocus`.
- `src/hooks/common/form/use-update-form.tsx` — same.
- `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateCreate.tsx` — pass `shouldFocusError: false` + `setFocus` for `controlPremium`; remove the now-redundant `onError`/`setActiveTab` tab-switch logic (superseded by `PremiumRatesField`'s own handling).
- `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateUpdate.tsx` — same wiring (it currently has no `onError` to remove).
- `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateForm.tsx` — thread `setFocusPremium` prop to `PremiumRatesField`.
- `src/pages/system/rate/non-holiday-rate/PremiumRatesField.tsx` — remove dead `PremiumRatesFieldHandle`; add `useFormState`-driven focus/tab-switch effect; accept `setFocus` prop; wire `onFirstDataRendered` for post-switch focus timing.
- `src/pages/system/rate/non-holiday-rate/PremiumRatesTable.tsx` — accept and forward an optional `onFirstDataRendered` prop to `CommonTable`.

## Verification

1. `npm run lint` — confirm no lint errors (named function declarations, import aliases, etc. per project conventions).
2. `npm run build-dev` — confirm `tsc -b` passes (new prop threading is fully typed).
3. Manual repro in the running app (`npm run dev`):
   - Open Non-Holiday Pay Rate → Create, advance to Pay Rates step.
   - Leave both Working Day and Rest Day tables with empty required fields.
   - While on the **Rest Day** tab, click submit → confirm focus lands on the first empty Rest Day input, and the tab stays on Rest Day.
   - While on the **Working Day** tab (only Rest Day has errors) → submit → confirm it switches to Rest Day and focuses the first errored field there.
   - Repeat both scenarios on **Update** (edit an existing record) to confirm the shared component now behaves correctly there too.
   - Confirm the case where only the active tab has an error still focuses correctly and does not switch tabs.
