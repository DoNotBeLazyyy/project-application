# Auto-focus first invalid field on premium-rate tab validation

## Context

We previously replaced the premium-rate submit flow's single `handleSubmit(onValid, onError)` call with manual, sequential `trigger()` calls, so that the active (visible) rate tab — Working or Rest Days — is validated first, and the inactive tab is only checked once the active tab passes. That behavior works.

The side effect: react-hook-form's `handleSubmit` auto-focuses the first invalid field by default (`shouldFocusError: true`), but only when a submit actually goes through `handleSubmit` and fails. Our new flow calls `trigger()` directly and returns early on failure — `handleSubmit` (and therefore its auto-focus) is never reached. That's why validation now works but the input no longer gets focused. The user's in-progress edit to `NonHolidayPayRateCreate.tsx` sketches the intended fix (call `setFocus` after a failed `trigger`, with a delay when switching tabs) but references `setFocus`, `errors`, and `getFirstErrorPath`, none of which exist yet.

Goal: restore (and improve) autofocus — after a failed validation, focus the first invalid field. If the error is on the tab the user is already viewing, focus it immediately. If it's on the *other* tab, switch to that tab first, then focus once its inputs have mounted.

## Root cause / key finding

`control.getFieldState(name)` is already public on the `Control` object returned by both `useCreateForm` and `useUpdateForm` (no hook change needed to read field validity). `setFocus`, however, is **not** part of `Control` — it only comes off `useForm()`'s top-level return, so it must be explicitly exposed from `useCreateForm`/`useUpdateForm` (same as `trigger` was in the previous change).

Also confirmed via code inspection: `ValidCommonInput` and `ValidCommonSelect` both forward the RHF field `ref` into MUI's `inputRef`, and MUI's `Select` exposes a real `.focus()` via `useImperativeHandle`, so `setFocus('workingDayRates.0.rateType')`-style calls will work correctly once the target row is mounted — including for ag-grid cell renderers in `PremiumRatesTable.tsx`, since those cells register with the *same* `control`.

The one real hazard: `PremiumRatesField.tsx` only mounts the active tab's `PremiumRatesTable`, and that table remounts ag-grid (via a `key` that includes `isActive`) whenever the tab flips. Focusing a field in the tab we just switched to must happen *after* that remount, not synchronously in the same tick as `setActiveTab`.

## Changes

### 1. `src/constants/api/system/rate.constant.ts`
Move `MAX_RATE_ROWS = 3` here (currently a local const in `PremiumRatesField.tsx`) so both `PremiumRatesField.tsx` and the new validation hook share one source of truth for the row bound used to scan for errors.

### 2. `src/hooks/common/form/use-create-form.tsx` and `use-update-form.tsx`
Destructure `setFocus` from the internal `useForm()` call (alongside the already-exposed `trigger`) and add it to each hook's return object.

### 3. New hook: `src/hooks/pages/system/rate/use-non-holiday-pay-rate-tab-validation.tsx`
Mirrors the naming/folder convention of the sibling `use-non-holiday-pay-rate-table.tsx`. Exports `useNonHolidayPayRateTabValidation`, shared by both Create and Update so the tab-priority + focus logic isn't duplicated and drifted between the two forms.

```ts
interface Params {
    control: Control<NonHolidayPayRatePremiumDTO>;
    trigger: UseFormTrigger<NonHolidayPayRatePremiumDTO>;
    setFocus: UseFormSetFocus<NonHolidayPayRatePremiumDTO>;
    activeTab: number;
    setActiveTab: Dispatch<SetStateAction<number>>;
}
```

Internals:
- `getFirstErrorField(arrayName)`: loops row index `0..MAX_RATE_ROWS-1` × the four row field keys (`rateType`, `rateValue`, `fromHours`, `toHours`), returning the first path where `control.getFieldState(path).invalid` is true. Safe to over-scan past the actual row count — `getFieldState` on an unregistered path just returns `invalid: false`.
- `validateTabs()`:
  1. `trigger(['effectiveDate', activeField])` — validates the always-visible date field plus the active tab's array in one pass.
     - On failure: focus `effectiveDate` if that's what's invalid, else `getFirstErrorField(activeField)`; call `setFocus`; return `false`. No tab switch, no delay needed — everything here is already mounted.
  2. `trigger(inactiveField)` — only reached if step 1 passed.
     - On failure: `setActiveTab` to the other tab, then `setTimeout(() => setFocus(getFirstErrorField(inactiveField)), 0)` to let the newly-mounted tab's grid register its field refs before focusing; return `false`.
  3. Both pass → return `true`.

Returns `{ validateTabs }`.

### 4. `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateCreate.tsx`
Replace the current broken hand-edited `validatePremiumTabs` with a call to the shared hook:
```ts
const { validateTabs } = useNonHolidayPayRateTabValidation({
    control: controlPremium,
    trigger: triggerPremium,
    setFocus: setFocusPremium,
    activeTab,
    setActiveTab
});

async function handlePremiumConfirm() {
    if (!await validateTabs()) return;
    controlPremium.handleSubmit(createNonHolidayPayRate)();
}
```
(`setFocus: setFocusPremium` comes from destructuring `useCreateForm`'s new `setFocus` return value, renamed same way `trigger` was renamed to `triggerPremium`.)

### 5. `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateUpdate.tsx`
Same shape, using `activePremiumTab`/`setActivePremiumTab` (the sub-tab state, distinct from the outer country-details/pay-rates step tab) and `setFocus` from `useUpdateForm`:
```ts
const { validateTabs } = useNonHolidayPayRateTabValidation({
    control: controlPremium,
    trigger: triggerPremium,
    setFocus: setFocusPremium,
    activeTab: activePremiumTab,
    setActiveTab: setActivePremiumTab
});

async function handlePremiumSubmit() {
    if (!await validateTabs()) return;
    handlePremiumConfirm();
}
```

### Not changing
- The Country Details step (`countryId` field) keeps using the hook's plain `handleConfirm` (`handleSubmit(...)`), which already auto-focuses correctly via RHF's default `shouldFocusError`. No change needed there.

## Verification
- `npx tsc -b --noEmit` and `npx eslint` on all touched files.
- Run `npm run dev`, open **Non-Holiday Pay Rate → Create**:
  - Advance to Pay Rates step, leave required fields empty on the active (Working) tab, click Save — confirm the first empty field on that tab gets focused.
  - Fill the Working tab validly, leave a required field empty on the Rest Days tab, click Save — confirm the tab switches to Rest Days *and* the first invalid field there receives focus.
- Repeat both scenarios in **Update** for an existing row.
