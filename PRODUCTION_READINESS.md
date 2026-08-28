# PRODUCTION_READINESS.md — Production Assessment & Strategic Roadmap

This document provides a critical engineering assessment of whether the AU-JAS LMS is ready for live production use, details security liabilities, evaluates database synchronization options, and delivers an architectural recommendation on **continuing with this codebase vs. starting from scratch**.

---

## 1. Production Readiness Verdict

> **VERDICT: 🟡 NOT READY FOR LIVE PRODUCTION (Estimated 1.5 to 2 Weeks of Engineering Required)**

While the application features comprehensive end-to-end functionality, high architectural discipline, and advanced features (psychometric item analysis, AI advising, transmutation ladders), it contains **three critical security and operational blockers** that must be resolved before deploying to real students and faculty.

### Critical Blockers for Production
1. **Service Role Key Exposed in Client Bundle (Critical Security Vulnerability)**:
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` is referenced in `src/services/supabase.admin.ts`.
   - Vite inlines all `VITE_*` environment variables directly into the compiled JavaScript browser bundle (`dist/assets/*.js`).
   - Anyone opening browser developer tools can extract the service role key and completely bypass all Row Level Security (RLS) to read/write/delete any table in the database.
   - **Fix Required**: Move the user provisioning actions (`auth.admin.inviteUserByEmail`) into a secure Supabase Edge Function, delete `supabase.admin.ts`, and rotate the service role key in the Supabase Dashboard.
2. **Lack of a Migration Runner & Schema Drift Hazard**:
   - Database changes have been applied manually via 47+ SQL scripts in `docs/sql/`.
   - There is no automated migration ledger (`supabase_migrations` table), leading to potential signature mismatches between the live database and code.
3. **Absence of Automated Test Suite**:
   - There are zero unit or integration tests (`npm run build-dev` / TypeScript strict checking is the sole automated gate).
   - Critical paths like grade calculation, assessment timer countdowns, and student enrollment transitions require automated test coverage to prevent regressions.

---

## 2. SQL Strategy: Dump Supabase or Keep Current SQL?

### Question: Should you dump the SQL from Supabase, or keep the current SQL here since they are 1:1?

### Strategic Recommendation: **DO A ONE-TIME FRESH DUMP + ADOPT SUPABASE CLI MIGRATIONS**

#### Why?
1. **The 1:1 Assumption is Fragile**: Over the course of 47+ manual script executions, live Supabase instances often contain leftover function overloads, temporary test triggers, or slightly modified parameter signatures (e.g. `fn_update_user` 4-param vs 3-param overloads).
2. **`supabase_ai_context.sql` is Stale**: The existing snapshot in repo root is frozen and missing over 100 recent RPCs.

#### Step-by-Step Action Plan:
1. **Run a Fresh Schema Dump**:
   ```bash
   npx supabase db dump --schema public -f supabase/schema_live.sql
   ```
2. **Transition to Versioned Migrations**:
   Organize future database updates into `supabase/migrations/` using standard timestamps (`YYYYMMDDHHMMSS_name.sql`).
3. **Retain `docs/sql/` as Cumulative History**:
   Keep `docs/sql/` as historical change documentation, but make `supabase/migrations/` the single operational source of truth.

---

## 3. Strategic Decision: Continue This Codebase vs. Start from Scratch?

### Question: Would it be better to start from scratch and develop the LMS, or continue with this codebase?

### Recommendation: **CONTINUE WITH THIS CODEBASE (DO NOT START FROM SCRATCH)**

#### Why Starting from Scratch is a Mistake:
1. **Massive Domain Completeness**:
   - This codebase has already solved the hardest academic domain problems:
     - 5 isolated user roles with dynamic switching.
     - Section-level 8-tab faculty instructional workstation.
     - Prerequisite dependency validation trees.
     - Continuous grading with custom period/component weighting.
     - Transmutation ladders (converting percentages to 1.00–5.00 scales).
     - Full assessment builder with 7 question types, timed sessions, and Classical Test Theory psychometrics.
     - AI assistant Edge Function with Gemini context extraction.
   - Rebuilding this from scratch would take **at least 3 to 5 months of full-time development** and would likely reintroduce all the domain edge cases that this codebase has already resolved.
2. **Exceptional Architectural Consistency**:
   - Unlike most student or startup codebases, this repository follows strict architectural rules:
     - 100% of Supabase calls are isolated in `@services/` via uniform wrappers.
     - Zero relative imports (`@components`, `@pages`, etc.).
     - 100% strict TypeScript typing without `any`.
     - Standardized pagination envelopes (`CommonListResDto<T>`).
     - Standardized UI component library (`CommonTableCard`, `ValidCommonInput`).
3. **The Problems Are Small and Localized**:
   - The defects identified in QA (assessment resume, service-role key, bulk delete) do not require architectural rewrites. They are focused 1-to-2 hour fixes.

---

## 4. Production Launch Checklist (1.5-Week Roadmap)

### Week 1: Security & Core Fixes (Estimated: 4 Days)
- [ ] **Auth Edge Function**: Create `supabase/functions/admin-user-provision` for user creation/invites.
- [ ] **Remove Service Role Key**: Delete `src/services/supabase.admin.ts` and remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from frontend environment files.
- [ ] **Rotate Key**: Rotate Supabase Service Role Key in project dashboard.
- [ ] **Assessment Session Fixes**:
  - Implement resume session logic on page refresh in `fn_start_assessment_timer`.
  - Add timer auto-submission background check.
- [ ] **Fix Admin & Dean Edge Bugs**:
  - Fix School Year bulk delete array handling.
  - Preserve `lab_units` in Course Update modal.

### Week 2: Schema Migration & Verification (Estimated: 3 Days)
- [ ] **Supabase CLI Integration**: Dump clean schema and establish `supabase/migrations/`.
- [ ] **Automated Testing**: Add Vitest and write unit tests for `fn_calculate_final_grade`, enrollment state transitions, and assessment submission state machine.
- [ ] **Staging Smoke Test**: Perform end-to-end verification across all 5 roles using live accounts.

