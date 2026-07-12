# Admin Grading Config — Lazy Tab Fetch, Whole-Number Transmutation, AG-Grid Focus Fix

## Context

Three follow-up issues in the Admin → Grading Configuration area:

1. **Eager fetching.** [index.tsx](src/pages/admin/grading-config-management/index.tsx) loads all four tabs' data at once on mount (`Promise.all`). The admin wants each tab to (re)fetch its own data every time it is landed on.
2. **Transmutation percentages must be whole 0–100.** The just-shipped fixed-ladder derives `Max = floor − 0.01` (e.g. 97.99). The admin wants whole numbers only, both bounds in 0–100, and the Min input must reject out-of-range / decimal / negative typing.
3. **AG-Grid inputs drop focus after one keystroke.** Parent forms call `watch()`/`useWatch()` (e.g. [PeriodModalForm.tsx#L44](src/pages/admin/grading-config-management/PeriodModalForm.tsx#L44), [CourseForm.tsx#L29](src/pages/dean/course-management/CourseForm.tsx#L29)), re-rendering on every keystroke. [CommonFormTable](src/components/table/CommonFormTable.tsx) rebuilds `rowDataWithIndex` with fresh object refs, and ag-grid has **no `getRowId`**, so it recreates rows and remounts the input → focus lost.

### Decisions (locked via interview)

- **Lazy tab fetch:** refetch on every landing; gate each tab body behind a per-tab loading state so forms mount with fresh data (no stale flicker).
- **Pure-floor whole bands:** floors are whole 0–100; grade lookup uses **Min only** (highest floor a raw grade meets). `Max` becomes cosmetic, stored/shown as whole `nextFloor − 1` (top rung = 100). No gaps for decimal raw grades. Revises the SQL from the prior task.
- **Shared focus fix:** add a stable `getRowId` in `CommonFormTable` (uses the `useFieldArray` row `id`) so all form tables stop dropping focus.

## Backend — revised SQL (user-run in Supabase SQL editor)

Update [docs/sql/transmutation-fixed-ladder.sql](docs/sql/transmutation-fixed-ladder.sql):

- **`fn_save_transmutation_table`**: additionally require each `min_percentage` to be a whole integer (`v_floor = trunc(v_floor)`). Derive `max = 100` for the top rung, else `prev_floor − 1` (whole). Keep exactly-10-rungs, canonical-grade-set, strictly-decreasing-floor, and 5.00-floor-0 validations.
- **`fn_calculate_final_grade`**: change the lookup to floor-only + global fallback:
  ```
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND v_raw_grade >= gtt.min_percentage
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
  LIMIT 1
  ```
- **Seed**: whole-number maxes (1.00: 98–100, 1.25: 95–97, … 3.00: 75–76, 5.00: 0–74).

## Frontend

### Per-tab lazy fetch — [index.tsx](src/pages/admin/grading-config-management/index.tsx)
- Replace the single `loadAll` effect with per-tab loader functions (reuse existing `getGradingConfig` / `getTransmutationTable` / `getGradingPeriodTemplates` / `getSpecialGradeConfigs` from [grading-config.service.ts](src/services/grading-config.service.ts)).
- `useEffect([activeTab])` → set a `tabLoading` flag, call the active tab's loader, store its data, clear the flag.
- Render: while `tabLoading`, show the existing "Loading…" block inside the tab body; else render the active tab component (which mounts with fresh data). Fetch runs on first mount (`general`) and on every subsequent tab landing.

### Whole-number Min input — [TransmutationTab.tsx](src/pages/admin/grading-config-management/TransmutationTab.tsx)
- `MinFloorCell` FormField gains `fieldProps: { min: 0, max: 100, maxDecimals: 0, maxDigits: 3 }` (pattern already used in [PeriodTableForm.tsx#L27](src/pages/admin/grading-config-management/PeriodTableForm.tsx#L27)). `CommonNumberInput` already blocks decimals when `maxDecimals: 0`, filters negatives, and auto-clamps to `max`.
- `deriveMax`: top rung → `100`; else `prevFloor − 1` (whole). Update `DerivedMaxCell` display accordingly.
- `validateLadder`: add a whole-integer check for each editable floor.

### Shared focus fix — [CommonFormTable.tsx](src/components/table/CommonFormTable.tsx)
- Pass `getRowId={(params) => String(params.data.id ?? params.data._index)}` to the underlying `CommonTable` (flows through to `AgGridReact` via `{...props}`). `CommonTableProps` already extends `AgGridReactProps`, so no type change needed. `rowDataWithIndex` already carries the `useFieldArray` `id`.

## Verification

1. **Types/lint:** `npm run build-dev` (pre-existing unrelated branch errors remain) and `npx eslint --fix` on the touched files; confirm no new errors in them.
2. **Focus bug:** `npm run dev` → Grading Config → Periods (add a component) and Transmutation → type multiple characters continuously in a cell; focus must persist. Repeat on Dean → Course prerequisites.
3. **Lazy fetch:** switch tabs and watch the network/loading; each landing refetches; the tab shows its loading state then fresh data.
4. **Whole-number range:** in Transmutation Min, try typing `1.5`, `-3`, `250` → decimals/negatives rejected, values clamp to ≤100; derived Max shows whole numbers; ordering errors still block Save.
5. **Consumer:** run the revised SQL, then trigger `fn_calculate_final_grade` for a student with a decimal raw (e.g. 94.75) → maps to the correct rung (1.50) with no NULL.
