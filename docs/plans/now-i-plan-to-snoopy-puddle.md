# Non-Holiday Pay Rates — Phase 1 (Locales, Types, List/Select Screen)

## Context

The HRIS app needs a new **Non-Holiday Pay Rates** feature. A route + page stub already
exist (`src/pages/system/rate/non-holiday-rate/index.tsx` returns `<h1>NON HOLIDAY RATE</h1>`,
wired in `src/routes/system/rate.route.tsx` at `country-rates/non-holiday`).

This phase delivers the **foundation only**:
1. All locale strings for the whole feature (create/modify/discard/error modals included), reusing existing keys wherever they already exist.
2. The `non-holiday-pay-rate.type.ts` types/interfaces as specified, plus a list-row interface.
3. The **list/select screen** built on the canonical `country` pattern, loading **dummy data** and rendering rows. The Country column shows the resolved **country name**; the Pay Rate Types column is a **string** listing each row's rates.

The Add / edit / delete buttons render but are **not functional yet** (later phase). The create/update tabbed modal is **out of scope** for this phase (locales for it are still added now).

Pattern reference: `src/pages/system/organization/country/` and its parallel trees.

## Naming note

The page directory is the already-routed `non-holiday-rate/`; the type/service/locale slug the
user specified is `non-holiday-pay-rate`. We keep both (no route change needed). Default export
stays `SystemNonHolidayRate` so the existing route import is untouched.

---

## 1. Locales

**New file `src/locales/en/non-holiday-pay-rate.json`** — only keys that don't already exist.
Register it in `src/locales/en/index.ts` (add **both** an `import` line and a `...spread` line — there is no auto-registration).

Reuse existing keys (do NOT duplicate): `country` (= "Country", country.json), `country_details`,
`discard_changes` + `unsaved_changes` + `unsaved_confirm_text_1` (modal.json), `create`/`save`/`cancel`/`confirm`/`discard`/`continue_later` (action.json), `status` (common.json).

New keys to add:

```json
{
    "pay_rates": "Pay Rates",
    "pay_rates_subtitle": "Click any row to view country's pay rates",
    "add_pay_rates": "Add Pay Rates",
    "pay_rate_types": "Pay Rate Types",
    "create_country_pay_rates": "Create Country Pay Rates",
    "effective_date": "Effective Date",
    "premium_rates": "Premium Rates",
    "working": "Working",
    "rest_days": "Rest Days",
    "add_pay_rate_title": "Add Country Pay Rate?",
    "add_pay_rate_confirm_text": "Confirm you want to add \"{{name}}\"",
    "pay_rate_added_title": "Pay Rate Added!",
    "pay_rate_added_text": "Pay Rate \"{{name}}\" has been added.",
    "modify_pay_rate_title": "Modify Pay Rate?",
    "modify_pay_rate_confirm_text": "Confirm you want to save these changes.",
    "unable_to_save_title": "Unable to Save Changes",
    "pay_rate_exists_text": "Pay Rate \"{{name}}\" for {{country}} already exists.",
    "pay_rate_modified_title": "Pay Rate Modified!",
    "pay_rate_modified_text": "Pay Rate \"{{name}}\" has been modified.",
    "error_occurred_title": "An Error Occurred!",
    "pay_rate_save_failed_text": "Pay Rate \"{{name}}\" failed to save."
}
```

Notes: the user's "Creation Successful" subtitle literally read `Designation "..." has been added.`
— treated as a copy-paste typo and normalized to **"Pay Rate"**. For the Discard modal we reuse
the existing `discard_changes` / `unsaved_changes` / `unsaved_confirm_text_1` keys rather than add
near-duplicates. `ko/index.ts` stays empty (no Korean exists; no `fallbackLng`).

## 2. Types — `src/types/api/non-holiday-pay-rate/non-holiday-pay-rate.type.ts` (new)

User-specified types verbatim, plus the list-row interface and a list request/response type
(mirroring `country.type.ts`'s use of `CommonListResDTO` / `PaginationReqDTO` from
`@type/api/common/pagination.type`).

```ts
import { CommonListResDTO, PaginationReqDTO } from '@type/api/common/pagination.type';

export type RateTypes = 'Regular' | 'Overtime' | 'Night Differential';

export interface PayRatesDTO {
    rateType: string;
    rateValue: string;
    fromHours: string;
    toHours: string;
    isRestDay: boolean;
}

export interface NonHolidayPayRateReqDTO {
    countryId: string;
    effectiveDate: string;
    payRateList: PayRatesDTO[];
}

export interface NonHolidayPayRateFormDTO {
    countryId: string;
    effectiveDate: string;
    workingDayRates: PayRatesDTO[];
    restDayRates: PayRatesDTO[];
}

// Added for the list/select screen.
export interface NonHolidayPayRateListDTO {
    countryId: string;
    payRateTypes: string;
}

export type NonHolidayPayRateListReqDTO = PaginationReqDTO;

export type NonHolidayPayRateResDTO = CommonListResDTO<NonHolidayPayRateListDTO>;
```

(Create-modal form/req types are present now but only consumed in a later phase.)

## 3. Mock service — `src/services/non-holiday-pay-rate/non-holiday-pay-rate.service.ts` (new)

Mirror `country.service.ts`: top-of-file `/* eslint-disable no-console */`, an in-memory
`nonHolidayPayRateList: NonHolidayPayRateListDTO[]` of dummy rows whose `countryId` values match
the country mock (`'1'`=Philippines, `'2'`=South Korea, …) and whose `payRateTypes` are strings
like `'Regular, Overtime, Night Differential'`. Export
`getNonHolidayPayRates(params: NonHolidayPayRateListReqDTO)` reproducing the exact pagination
shape returned by `getCountries` (`content, empty, first, last, number, numberOfElements,
pageable{...}, size, sort{...}, totalElements, totalPages`). No create/delete functions this phase.

## 4. Table hook — `src/hooks/pages/system/rate/use-non-holiday-pay-rate-table.tsx` (new)

Slimmed copy of `use-country-table.tsx` (no row-menu/edit/delete wiring yet — buttons non-functional):
- `useSelectCountry()` (`@hooks/common/select-option/api/use-select-country`) → build a `countryId → label` lookup so the Country column renders the **name**.
- `leadingColumnDefs: ColDef<NonHolidayPayRateListDTO>[]`:
  - `field: 'countryId'`, `headerName: t('country')`, `flex: 3`, `sortable`, cellRenderer resolves the name via the lookup and renders `<PrimarySecondaryText primary={name} />`.
  - `field: 'payRateTypes'`, `headerName: t('pay_rate_types')`, `flex: 2`, `sortable` (plain string value).
- `tableProps: CommonTableProps<NonHolidayPayRateListDTO>` = `{ alwaysMultiSort, leadingColumnDefs, rowData, rowSelection: { enableClickSelection: false, mode: 'multiRow' }, onGridReady, onSelectionChanged }` (omit `actionConfig` for now).
- Params typed via `CommonTableParams<NonHolidayPayRateListDTO>` but only `rowData`, `onGridReady`, `onSelectionChanged` are used.

## 5. List page — `src/pages/system/rate/non-holiday-rate/index.tsx` (replace stub)

Mirror `country/index.tsx`, trimmed to what's functional:
- `useTablePagination({ module: 'non-holiday-pay-rates', onFetchRowData: getNonHolidayPayRates })`
- `useTableState<NonHolidayPayRateListDTO>()`
- the new table hook
- Render `<CommonListCard>`:
  - `titleProps={{ title: t('pay_rates'), description: t('pay_rates_subtitle') }}` (`ListTitle` already supports `description` as the subtitle).
  - `actionProps.createProps` with the **"Add Pay Rates"** label (`t('add_pay_rates')`) and a no-op `onClick` (non-functional this phase); confirm the label prop name on `ListAction.createProps` when implementing.
  - `paginationProps={{ pagination, onSetPagination: setPagination }}`, `tableProps`.
- No `<Create>`/`<Update>`/`<RowMenuList>` yet.

Keep `export default function SystemNonHolidayRate()` so `rate.route.tsx` needs no change.

---

## Verification

1. `npm run lint` — must pass (path aliases only, named function declarations, no `console.*` outside the eslint-disabled mock service, 4-space/single-quote formatting).
2. `npm run build-dev` — `tsc -b` type-checks the new types/usages.
3. `npm run dev`, navigate to `country-rates/non-holiday`:
   - Title "Pay Rates" + subtitle render; "Add Pay Rates" button shows but does nothing.
   - Grid shows dummy rows; **Country** column shows resolved names (e.g. "Philippines"), **Pay Rate Types** shows the rates string; pagination works.
4. Confirm new locale keys resolve (no raw `pay_rates` keys shown) and no console errors.
