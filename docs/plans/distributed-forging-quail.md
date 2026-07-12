# Plan: Fix the Non-Holiday Pay Rate **Update** submit (validate + log combined payload)

## Context

On the current branch (`develop_non-holiday-pay-rates`), **Create** works correctly but **Update** is broken. The Update "Pay Rates" tab shows the country + effective date + premium rate rows, but clicking **Save** never validates the rate rows and never submits them — it only persists the disabled country field. This sprint fixes Update so that, *just like Create*, it validates the whole form on submit and logs the outgoing API payload on success.

This was confirmed by a grilling session; the domain decisions and the exact bug are recorded below.

## Domain decisions (from grilling — to be written into docs, see end)

- A **Non-Holiday Pay Rate** is **one record per country**. Updating **overrides** the current record; the previous one is appended to **History as inactive**. Only **one active version per country** at a time.
- The Update form (unlike Create's two-step stepper) renders **countryId + effectiveDate + premium rates together in one tab** ("Pay Rates"); a second tab shows read-only **History**. Country is display-only (disabled) on update.
- On a successful update, log **one** payload in the shape of `NonHolidayPayRateReqDTO` = `{ countryId, effectiveDate, payRateList: PayRatesDTO[] }` ([type:24-33](src/types/api/non-holiday-pay-rate/non-holiday-pay-rate.type.ts#L24-L33)). `payRateList` = `[...workingDayRates, ...restDayRates]`.
- Submit **mirrors Create**: `validateTabs()` → submit → success alert. **No** intermediate "are you sure?" confirmation modal. `effectiveDate` keeps its `min = today` rule.

## The bug (verified)

In [NonHolidayPayRateUpdate.tsx](src/pages/system/rate/non-holiday-rate/NonHolidayPayRateUpdate.tsx), the outer tabs are `['pay_rates','history']` so `activeTab === 0` is Pay Rates, but the premium wiring is inverted:

- `isPremiumTab = activeTab === 1` (L43) — true on **History**, not the premium tab.
- `controlPremium` is `enabled: isPremiumTab` (L67) — premium data fetches on the wrong tab; on Pay Rates (where rows render) it isn't loaded.
- `onConfirm = isPremiumTab ? handlePremiumSubmit : handleConfirm` (L123-127) — on Pay Rates, Save routes to `handleConfirm` → `putNonHolidayPayRateDetails` (country only). `validateTabs()` + premium submit are attached to History, whose buttons are hidden.

Create does it right for reference: `handlePremiumConfirm` = `validateTabs()` then `controlPremium.handleSubmit(createNonHolidayPayRate)()`, assembling the payload ([Create.tsx:95-108](src/pages/system/rate/non-holiday-rate/NonHolidayPayRateCreate.tsx#L95-L108)). `control.handleSubmit` is a valid RHF v7 call (the `Control` object exposes it), so Update can use the same pattern.

## Changes

### 1. `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateUpdate.tsx`

- Flip the flag: `const isPayRatesTab = activeTab === 0;` and use it everywhere `isPremiumTab` was used (inverted). `controlPremium` → `enabled: isPayRatesTab`.
- Route Save on the Pay Rates tab to a custom submit that mirrors Create; drop the generic `handlePremiumConfirm` usage:
  ```
  async function updateNonHolidayPayRate(premium: NonHolidayPayRatePremiumDTO) {
      if (!id) { return; }
      await putNonHolidayPayRate({
          countryId: id,
          effectiveDate: premium.effectiveDate,
          payRateList: [...premium.workingDayRates, ...premium.restDayRates]
      });
      await onFetchRowData();
      onClose();
  }
  async function handlePremiumSubmit() {
      if (!await validateTabs()) { return; }
      controlPremium.handleSubmit(updateNonHolidayPayRate)();
  }
  ```
- `onConfirm` = `isPayRatesTab ? handlePremiumSubmit : handleConfirm`; `onClose` = `isPayRatesTab ? handlePremiumRequestClose : handleRequestClose`. History tab keeps buttons hidden.
- The details `useUpdateForm` stays **only to fetch/populate the disabled country field** — its patch is no longer invoked (one payload for the API, as required).

### 2. `src/services/non-holiday-pay-rate/non-holiday-pay-rate.service.ts`

- Add `putNonHolidayPayRate(params: NonHolidayPayRateReqDTO): Promise<void>` mirroring `postNonHolidayPayRate`: `console.log` the `params` (already in `NonHolidayPayRateReqDTO` shape), refresh the list row's `payRateTypes` from `params.payRateList` (reuse the dedupe pattern in `getPayRateTypes`), and show the success/failure alert via the existing `openModifiedAlert` / `openSaveFailedAlert` helpers.
- Remove the now-unused `putNonHolidayPayRatePremium`. Keep `getNonHolidayPayRateDetails`, `getNonHolidayPayRatePremium` (still used to populate the form) and `putNonHolidayPayRateDetails` (still the details control's `onPatchData`, satisfying the hook contract even though it isn't called).

No changes needed to `NonHolidayPayRateForm.tsx` beyond what's already in the working tree (button visibility on the History tab is already handled via `showCancel`/`showConfirm`).

## Domain docs to write on execution (domain-modeling)

- **`CONTEXT.md`** (create — doesn't exist yet): glossary for *Non-Holiday Pay Rate* (one active version per country; update overrides + pushes previous to history-inactive), *Premium Rate row*, *Rate Type* (Regular | Overtime | Night Differential, unique per set), *Working-day vs Rest-day rates* (parallel, kept in lockstep by row), *Effective Date* (≥ today), *History*, *Status* (active flag).
- **ADR** (`docs/adr/0001-non-holiday-pay-rate-override-to-history.md`): record the single-active, effective-dated, override-to-history lifecycle — it's hard to reverse, surprising without context, and chosen over in-place mutation and explicit multi-version.

## Verification

- `npm run lint` and `npm run build-dev` (tsc) pass.
- `npm run dev`, open System → Non-Holiday Pay Rates → **Update** on a row:
  - Pay Rates tab loads the country (disabled) + effective date + premium rows.
  - Click **Save** with an empty/invalid required field → validation blocks submit and focuses the first invalid field, switching working/rest sub-tabs if the error is on the hidden one.
  - Fill valid data, Save → console logs exactly `{ countryId, effectiveDate, payRateList: [...] }`, success alert shows, list refreshes, modal closes.
  - History tab remains read-only with no Save/Cancel buttons.
