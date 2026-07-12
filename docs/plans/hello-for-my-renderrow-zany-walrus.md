# Fix premium-rate row add/delete de-sync between the Working and Rest tabs

## Context

`PremiumRatesField.tsx` keeps two parallel `useFieldArray`s (`workingDayRates`, `restDayRates`)
that must always stay the same length, and mutates both in lockstep (`handleAddRow`,
`handleDeleteRow`). After the ag-grid refactor, only the **active** tab's `PremiumRatesTable` is
mounted, so the **inactive** array's inputs are unmounted. Paired mutation then de-syncs:

- Delete with 2 rows → the active (mounted) array keeps its row, the inactive one drops to 1.
- Delete-then-add → the active tab gets two rows added, the inactive tab only one.

The pre-refactor code rendered **both** tab bodies in the DOM (one CSS-hidden), which kept both
arrays' inputs mounted and paired mutation reliable. The user chose to **keep ag-grid and harden
it** rather than drop the table. So the fix restores "both tabs mounted" while staying on
`CommonTable`, and cleans up the debug scaffolding currently in the file.

The file currently contains debug artifacts to remove: `console.log({ rowCount })`, the
`console.log('test 1'/'test 2')` in `handleDeleteRow`, the debug `useEffect` that logs both
arrays, the `Math.floor((working+rest)/2)` band-aid for `canAddRow`/`canDeleteRow`, and the typo
comment "rarestArraye".

## Changes

### `src/pages/system/rate/non-holiday-rate/PremiumRatesField.tsx`

- Keep both `useFieldArray`s and the `useWatch` values; keep the paired handlers
  (`handleAddRow` appends both, `handleDeleteRow` removes both — wrapped in `useCallback`,
  `handleRateTypeChange` mirrors to the sibling). These are correct **once both arrays are
  mounted**.
- Replace the `(working+rest)/2` band-aid with the straightforward derivations off a single
  length (arrays are kept equal): `rowCount = workingArray.fields.length`,
  `canAddRow = rowCount < MAX_RATE_ROWS`, `canDeleteRow = rowCount > 1`.
- Remove all debug `console.log`s, the debug `useEffect`, and the typo comment; drop now-unused
  `useMemo`/`useEffect` imports.
- Render **both** `PremiumRatesTable`s, each bound to its own array, toggling visibility with a
  `hidden` class (do not conditionally unmount). Pass a new `isActive` prop so the table can
  refresh itself when shown:

```tsx
<div className={activeTab === 0 ? undefined : 'hidden'}>
    <PremiumRatesTable
        arrayName="workingDayRates"
        canDeleteRow={canDeleteRow}
        control={control}
        isActive={activeTab === 0}
        isRestDay={false}
        rowData={workingArray.fields}
        onDeleteRow={handleDeleteRow}
        onRateTypeChange={handleRateTypeChange}
    />
</div>
<div className={activeTab === 1 ? undefined : 'hidden'}>
    <PremiumRatesTable
        arrayName="restDayRates"
        canDeleteRow={canDeleteRow}
        control={control}
        isActive={activeTab === 1}
        isRestDay
        rowData={restArray.fields}
        onDeleteRow={handleDeleteRow}
        onRateTypeChange={handleRateTypeChange}
    />
</div>
```

### `src/pages/system/rate/non-holiday-rate/PremiumRatesTable.tsx`

- Add `isActive: boolean` to the props.
- Because a `display:none` (`hidden`) grid with `domLayout="autoHeight"` measures its rows as 0,
  refresh row heights when the grid becomes active. Capture the grid API from `onGridReady`
  (already forwarded by `CommonTable` → `useTable`) into a ref, and in a `useEffect` keyed on
  `isActive`, after a `requestAnimationFrame`, call `api.resetRowHeights()` (falls back to
  `api.onRowHeightChanged()` if heights still look wrong). Types: `GridApi`, `GridReadyEvent`
  from `ag-grid-community`; `useEffect`/`useRef` from `react`.
- No other logic changes (columns, `PremiumRateRow`, header, `getRowId`, `context` stay as-is).

## Why this fixes it

With both tables mounted, both `useFieldArray`s always have their inputs registered, so
`workingArray.remove(i)`/`append` and `restArray.remove(i)`/`append` both take effect — the
regression was purely that the inactive array was unmounted. This mirrors the pre-refactor
behavior that worked. Stable `getRowId={p => p.data.id}` continues to let ag-grid remove the exact
removed row rather than recycle a stale one.

## Out of scope / still open

The earlier **focus-on-error** report is a separate issue (react-hook-form focuses the first
errored field, but `ValidCommonSelect`'s ref lands on MUI Select's hidden input, so a Rate Type
error focuses invisibly). Mounting both tabs registers both tabs' fields, but focusing a field on
the hidden tab won't switch tabs. Track/fix separately after confirming this de-sync fix.

## Verification

1. `npm run lint` + `npm run build-dev` (`tsc -b`) — expect no new errors in the two files.
2. `npm run dev` → non-holiday pay-rate create form → Premium Rates. Reproduce the exact repros:
   - Add one row (both tabs show 2). Delete a row → **both** tabs show 1. Switch tabs to confirm.
   - Add again → **both** tabs show 2 (no double-add on the active tab).
   - Add up to the max (3) → add button hides; delete down to 1 → delete button hides.
   - Switch tabs repeatedly and confirm the now-visible grid renders at correct row height
     (validation messages not clipped, rows not collapsed) — this exercises the `isActive`
     `resetRowHeights` refresh.
   - Rate-type selection still mirrors to the same row on the other tab and stays excluded from
     other rows.
