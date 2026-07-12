# Plan: Collapse Production-Operations into a single `/production-operations` endpoint (yearMonth)

## Context

The frontend for the Production-Operations dashboard now issues a **single** request per
screen and passes a `yearMonth` string (format `YYYYMM`, e.g. `202607`, `202501`) instead of a
bare `year`. Today `ProductionOperationsRestController` exposes **five** separate `GET` endpoints,
each taking `@RequestParam String year`. This change consolidates them into one aggregate endpoint
that returns all five datasets in one JSON object, and migrates the whole vertical
(controller → service → serviceImpl → mapper → XML) from `year` to `yearMonth`.

**Reformat-only semantics (decided):** none of the five queries scope by month today — each
already returns a full Jan–Dec breakdown for a year (plus prior-year comparisons). So the month
portion of `yearMonth` is **ignored**: we parse the year out of it and preserve today's behaviour
exactly. This mirrors the sibling `production` domain, which already took `yearMonth` and only
uses `LEFT(@YYYYMM, 4)`.

The `production` domain is the reference precedent for every part of this change
(`ProductionDTO` + `getProductionData` + a single root `@GetMapping`).

## Decisions (resolved during grilling)

1. **Single aggregate endpoint** at `/production-operations` (root `@GetMapping`, no sub-path),
   returning one aggregate DTO. Mirrors `ProductionRestController.getProductionData`.
2. **Response keys** (aggregate DTO fields), each holding the existing per-query result list:
   | key | current path | result type |
   |---|---|---|
   | `outsourcingCostStatus` | `status` | `List<YearlyOutsourcingCostStatusDTO>` |
   | `monthlyProductTrend` | `monthly-product-trend` | `List<MonthlyProductTrendDTO>` |
   | `monthlyProcessingTrend` | `monthly-processing-trend` | `List<MonthlyProcessingTrendDTO>` |
   | `vendorProcessingStatus` | `vendor-processing-status` | `List<YearlyVendorProcessingStatusDTO>` |
   | `vendorProcessingShare` | `vendor-processing-share` | `List<VendorProcessingShareDTO>` |
   (`status` → `outsourcingCostStatus` deviates from literal path-camelCase because `status`
   alone is meaningless inside the combined response; the other four are literal camelCase.)
3. **Old 5 endpoints:** first rewrite each to `@RequestParam(required = false) String yearMonth`,
   **then comment them out** (not delete) so a revert is a clean un-comment. Only the new
   aggregate endpoint stays active.
4. **Service/mapper stay granular and active:** keep the five service methods and five mapper
   methods (they run the five queries); the new aggregate service method calls them to build the
   DTO. Mirrors `ProductionServiceImpl.getProductionData`.
5. **yearMonth parsing lives in SQL**, mirroring `production.xml`: keep the existing `@YEAR INT`
   variable and every downstream reference unchanged; only replace the preamble that computes it.

## Changes

### 1. New aggregate DTO — `domain/production_operations/dto/ProductionOperationsDTO.java`
`@Getter @Builder`, five `@Schema`-annotated fields exactly as the key table above. Model on
[ProductionDTO.java](src/main/java/com/egemco/medicos/domain/production/dto/ProductionDTO.java).

### 2. Service — `ProductionOperationsService` (interface) + `ProductionOperationsServiceImpl`
- Rename every method's param `String year` → `String yearMonth` (pass-through).
- Add `ProductionOperationsDTO getProductionOperationsData(String yearMonth)`; impl builds the DTO
  by calling the five existing granular methods (`@Transactional(readOnly = true)`), mirroring
  [ProductionServiceImpl.java](src/main/java/com/egemco/medicos/domain/production/service/ProductionServiceImpl.java) lines 26-34.

### 3. Controller — `ProductionOperationsRestController`
- Add a single root `@GetMapping` → `getProductionOperationsData(@RequestParam(required = false)
  String yearMonth)` returning `Responses.ok(...)`, with `@Operation(summary = ...)`.
- Rewrite the five existing methods to `String yearMonth`, then comment out all five.

### 4. Mapper interface — `ProductionOperationsMapper`
Rename each method param `String year` → `String yearMonth`.

### 5. Mapper XML — `resources/mapper/production_operations/production_operations.xml`
In each of the five `<select>`, replace the param binding to `#{yearMonth}` and swap the
`@PARAM_YEAR`/`@YEAR` preamble for the yearMonth form, keeping `@YEAR` (INT) so the rest of every
query is untouched:

```sql
DECLARE @YYYYMM NVARCHAR(6) = #{yearMonth}

SET @YYYYMM = CASE
    WHEN @YYYYMM IS NULL OR @YYYYMM = '' THEN CONVERT(NVARCHAR(6), GETDATE(), 112)
    ELSE @YYYYMM
END

DECLARE @YEAR INT = CAST(LEFT(@YYYYMM, 4) AS INT)
```
Also update `parameterType="string"` stays as-is; only the `#{year}` → `#{yearMonth}` binding and
the preamble change. No other line in any query changes.

## Docs (domain-modeling)
- **CONTEXT.md** (create at repo root; none exists yet): add a `yearMonth` glossary entry —
  canonical `YYYYMM` time parameter for all monitoring queries; _Avoid_: `year`, `yyyymm`.
- **No ADR.** The single-aggregate-endpoint shape is treated as transitional (old endpoints are
  commented out for easy revert), so it is deliberately not recorded as a standing decision.

## Verification
- `./gradlew build` compiles (aggregate DTO, renamed params, commented endpoints).
- `./gradlew bootRun -Pprofile=dev`, then hit `GET /medicos-api/production-operations?yearMonth=202607`
  via Swagger UI (served at context root) — response is one object with the five keys populated.
- Call with no param and with `yearMonth=202501`; confirm each key's payload matches what the old
  per-endpoint calls returned for that year (reformat-only ⇒ identical data).
