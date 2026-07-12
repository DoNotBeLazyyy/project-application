# Non-Holiday Pay Rates — Two-Tab Form + Dynamic Premium Rate Tables

## Context

The Non-Holiday Pay Rates CRUD (list, delete-on-select, row menu, create/update modals, success/unsuccessful/error/confirm alerts) is **already implemented and working**. The create/update form is currently a flat single section (country + effective date), with the Working/Rest-day premium-rate tables deferred.

This change builds out that deferred form into a **two-step (Next → Save) modal** with **dynamic premium-rate tables**:

- **Two top-level tabs/steps**: **Country Details** (the Country field) and **Pay Rates** (Effective Date + Premium Rates).
- **Premium Rates** = two sub-tabs **Working** and **Rest Days**, each a dynamic table of rate rows backed by `useFieldArray` (the codebase's *first* `useFieldArray` usage).
- The two arrays (`workingDayRates` / `restDayRates`) are kept **in lockstep**: same number of rows, and the **`rateType` column synced** per row (editing in either tab mirrors to the other). The other columns (`rateValue`, `fromHours`, `toHours`) are independent per tab.
- **`rateType` options exclude values already chosen by other rows** (only 3 types exist: Regular / Overtime / Night Differential).
- **`isRestDay`** is not a UI field — it's baked into the row data (`false` for working rows, `true` for rest rows) at append/submit time. (Hidden dynamic-list fields don't register with RHF, so it cannot be a hidden field.)
- **Add-row button** shows only when `< 3` rows; **per-row delete action** shows only when `> 1` row; **minimum 1 row** always.
- **All rate columns are required** before Save.

### Decisions (confirmed with user)
- Row model: **two arrays in lockstep** (keep existing `workingDayRates`/`restDayRates` DTO; mirror on every rateType change / add / remove).
- Validation: **all columns required** (rateType, rateValue, fromHours, toHours).
- Navigation: **sequential Next → Save** (Country Details validates on "Next" before advancing; Pay Rates validates on "Save") — mirrors the existing Country create stepper.

## Reference pattern (mirror exactly)

The existing **Country** create/update is a two-section stepper/tab form using **two `useCreateForm`/`useUpdateForm` instances** (one per section), combined at submit:
- `src/pages/system/organization/country/CountryCreate.tsx` — stepper, `onConfirm: () => setActiveStep(1)` on section 1, `onPostData` posts both sections.
- `src/pages/system/organization/country/CountryUpdate.tsx` — `CommonTabMenu` (free tabs), two `useUpdateForm`.
- `src/pages/system/organization/country/CountryForm.tsx` — single `ConfirmModal`, toggles which `ValidDynamicFieldList` renders by `activeForm`.

We adopt this **two-form split** because `useCreateForm`/`useUpdateForm` expose only `control` (no `setValue`/`getValues`/`trigger`, no `FormProvider`), and a single `onConfirm` prop can't both "advance" and "post". Split: **Form A = Country Details** (`{ countryId }`), **Form B = Pay Rates** (`{ effectiveDate, workingDayRates, restDayRates }`). Form A's confirm advances the step; Form B's `onPostData` posts the combined `NonHolidayPayRateFormDTO`.

Key infra confirmed:
- `useStepper` (`src/hooks/common/stepper/use-stepper.ts`) + `CommonStepper` — clicking a reached step calls `setActiveStep` with no validation. `useTabMenu` + `CommonTabMenu` (`menuStyle="pill"`) for the inner Working/Rest sub-tabs.
- `custom` field render-prop in the dynamic list passes only `{ control }` (`src/hooks/components/field/use-valid-dynamic-field-list.tsx:73-82`) — but the rate tables are complex enough to be a **dedicated component** rendered directly in Form B, not a `custom` cell.
- `ValidCommonSelect`/`ValidCommonInput` accept dotted/indexed `name` paths (e.g. `workingDayRates.0.rateValue`) plus `control`, `rules`, and a post-RHF `onChange`. Both sub-tab tables must stay **mounted** (toggle visibility with a `hidden` class, not conditional render) so `handleSubmit` validates every row in both arrays.

---

## Changes

### 1. Types — `src/types/api/non-holiday-pay-rate/non-holiday-pay-rate.type.ts`
Add the two per-section form DTOs (keep `NonHolidayPayRateFormDTO` as the combined submit shape, `PayRatesDTO` unchanged):
- `NonHolidayPayRateDetailsDTO { countryId: string }`
- `NonHolidayPayRatePremiumDTO { effectiveDate: string; workingDayRates: PayRatesDTO[]; restDayRates: PayRatesDTO[] }`

### 2. Constants
- `src/constants/api/system/rate.constant.ts`: add an empty-row factory and per-section defaults. Defaults start with **one row** in each array (min-1 rule):
  - `EMPTY_WORKING_RATE = { rateType: '', rateValue: '', fromHours: '', toHours: '', isRestDay: false }`
  - `EMPTY_REST_RATE = { ...EMPTY_WORKING_RATE, isRestDay: true }`
  - `NON_HOLIDAY_PAY_RATE_DETAILS_DEFAULT = { countryId: '' }`
  - `NON_HOLIDAY_PAY_RATE_PREMIUM_DEFAULT = { effectiveDate: '', workingDayRates: [EMPTY_WORKING_RATE], restDayRates: [EMPTY_REST_RATE] }`
  - `RATE_TYPE_OPTIONS: SelectOption[]` from `RateTypes` (Regular / Overtime / Night Differential).
- `src/constants/common/form-draft.constant.ts`: replace the single `NON_HOLIDAY_PAY_RATE_DRAFT_KEY` with `NON_HOLIDAY_PAY_RATE_DETAILS_DRAFT_KEY` + `NON_HOLIDAY_PAY_RATE_PREMIUM_DRAFT_KEY`.

### 3. New component — `src/pages/system/rate/non-holiday-rate/PremiumRatesField.tsx`
The dynamic rate tables. Receives `control: Control<NonHolidayPayRatePremiumDTO>`.
- `const workingArray = useFieldArray({ control, name: 'workingDayRates' })`; `const restArray = useFieldArray({ control, name: 'restDayRates' })`.
- `useWatch({ control, name: 'workingDayRates' })` / `restDayRates` for current values (to spread on `update`, and to compute chosen rateTypes).
- Inner Working/Rest sub-tabs via `useTabMenu` + `CommonTabMenu`; **both tables stay mounted**, the inactive one gets a `hidden` class.
- Drive rows off `workingArray.fields` (both arrays equal length by construction).
- **Add row** (`CommonButton` + `PlusIcon`): visible only when `fields.length < 3`. Appends to **both**: `workingArray.append(EMPTY_WORKING_RATE)` + `restArray.append(EMPTY_REST_RATE)`.
- **Per-row delete** (`TrashIcon` button): visible only when `fields.length > 1`. Removes from **both**: `workingArray.remove(i)` + `restArray.remove(i)`.
- Columns per row:
  - `rateType` — `ValidCommonSelect` bound to `workingDayRates.${i}.rateType` (working tab) / `restDayRates.${i}.rateType` (rest tab), `rules: { required }`. Its `onChange` **mirrors to the sibling** via `update`: e.g. working tab → `restArray.update(i, { ...restValues[i], rateType: newValue })` (and vice-versa). Programmatic `update` doesn't refire MUI `onChange`, so no loop. `options` = `RATE_TYPE_OPTIONS` filtered to exclude rateTypes chosen by **other** rows (keep the row's own value).
  - `rateValue` / `fromHours` / `toHours` — `ValidCommonInput` (`type="number"` for hours/value) bound to the indexed name in the active tab's array, `rules: { required }`. Not synced across tabs.

### 4. Form — `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateForm.tsx` (rewrite)
Mirror `CountryForm`: props `activeForm: number`, `control: Control<NonHolidayPayRateDetailsDTO>`, `controlPremium: Control<NonHolidayPayRatePremiumDTO>`, plus `CommonFormProps` (+ `children` for the stepper/tab menu).
- One `ConfirmModal`; confirm button text **`activeForm === 0 ? t('next') : t('save')`**.
- `activeForm === 0`: `ValidDynamicFieldList` with the **country** select row (bound to `control`).
- `activeForm === 1`: effective-date `date` field (bound to `controlPremium`) + the **Premium Rates** section (`<PremiumRatesField control={controlPremium} />`).

### 5. Create — `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateCreate.tsx` (rewrite)
Mirror `CountryCreate` (two forms + `useStepper`):
- Form A `useCreateForm<NonHolidayPayRateDetailsDTO>` (details default/draft key), `onConfirm: () => setActiveStep(1)`.
- Form B `useCreateForm<NonHolidayPayRatePremiumDTO>` (premium default/draft key), `extraDirty: formA.isDirty`, `onSaveDraft` persists Form A, `onPostData: (premium) => postNonHolidayPayRate({ countryId: detailsValues.countryId, ...premium })`.
- Toggle `onClose`/`onConfirm` by `activeStep`; render `<CommonStepper ... onStepClick={setActiveStep} />` as children. Reset to step 0 on close.

### 6. Update — `src/pages/system/rate/non-holiday-rate/NonHolidayPayRateUpdate.tsx` (rewrite)
Mirror `CountryUpdate` (two `useUpdateForm` + `useTabMenu`, `menuStyle="pill"`):
- Form A `useUpdateForm<NonHolidayPayRateDetailsDTO>` → `onFetchData: getNonHolidayPayRateDetails`, `onPatchData: putNonHolidayPayRateDetails`.
- Form B `useUpdateForm<NonHolidayPayRatePremiumDTO>` (`enabled: isPremiumTab`) → `onFetchData: getNonHolidayPayRatePremium`, `onPatchData: putNonHolidayPayRatePremium`.

### 7. Service — `src/services/non-holiday-pay-rate/non-holiday-pay-rate.service.ts`
- Keep `postNonHolidayPayRate`/`putNonHolidayPayRate` taking the combined `NonHolidayPayRateFormDTO` (already do); `getPayRateTypes` already reads `workingDayRates` + `restDayRates` rateTypes — still works.
- Add split fetch/patch helpers used by Update: `getNonHolidayPayRateDetails(id) → { countryId }`, `getNonHolidayPayRatePremium(id) → { effectiveDate, workingDayRates: [EMPTY_WORKING_RATE], restDayRates: [EMPTY_REST_RATE] }` (mock returns **one** empty row per array so the min-1 rule holds), and thin `putNonHolidayPayRateDetails`/`putNonHolidayPayRatePremium` wrappers (or reuse `putNonHolidayPayRate`). Existing single `getNonHolidayPayRate` can be removed or kept.

### 8. Locale — `src/locales/en/non-holiday-pay-rate.json` + `src/locales/en/action.json`
- `action.json`: add `"next": "Next"`.
- pay-rate JSON: add column/label keys — `"rate_type"`, `"rate_value"`, `"from_hours"`, `"to_hours"`, `"add_row"`, and a country-details step label key (e.g. `"country_details"` if not already shared) + step labels for the stepper (reuse existing `pay_rates` / `premium_rates`, `working`, `rest_days` which already exist).

---

## Notes / gotchas
- **Keep both Working/Rest tables mounted** (CSS `hidden`), not conditionally rendered, so `handleSubmit` validates all rows in both arrays (RHF skips validation of unmounted fields even though it retains their values). Same reason the top step toggling is handled by the two-form split rather than one control.
- `useFieldArray.update` preserves the row's other fields because we **spread the current `useWatch` value** and only override `rateType`.
- `isRestDay` is fixed via the `EMPTY_WORKING_RATE`/`EMPTY_REST_RATE` append defaults — never edited in the UI.
- Optional polish (not required): on Save with an error on the hidden sub-tab, auto-switch to it. Skip for now.

## Verification
1. `npm run lint` (named declarations, path aliases, 4-space/single-quote, Stroustrup braces) and `npx tsc -b` — new files must be error-free (ignore the pre-existing unrelated `@mui/icons-material` / `department.service` errors).
2. `npm run dev` → **Country Rates → Non-Holiday → Add Pay Rates**:
   - **Step 1 Country Details**: "Next" is disabled-path until a country is chosen (required); advancing moves to step 2.
   - **Step 2 Pay Rates**: Effective Date + Premium Rates with **Working/Rest Days** sub-tabs.
   - Starts with **1 row**; delete action hidden at 1 row. **Add Row** adds a row to both tabs (synced count); hidden once **3 rows** reached.
   - Selecting a **rateType** in one tab shows the same value in the other tab's same row; that type disappears from other rows' dropdowns.
   - Fill `rateValue/fromHours/toHours` in Working — they do **not** change Rest's values. **Save** is blocked until all columns in all rows of both tabs are filled.
   - **Save** → "Add Country Pay Rate?" confirm → success alert; new row appears (its `payRateTypes` reflects the chosen rate types).
   - **Edit** an existing row → both steps prefilled (≥1 row); Save → "Pay Rate Modified!".
