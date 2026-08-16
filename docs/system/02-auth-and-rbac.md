# 02 — Authentication & Access Control

Everything about identity in the system: how a user comes into existence, how they authenticate, how a session is held and lost, how roles are chosen, and — critically — where authorization is *actually* enforced. This chapter contains the highest-severity finding in the system.

## Contents

- [1. The two Supabase clients](#1-the-two-supabase-clients)
- [2. 🚨 Critical: the service-role key ships to the browser](#2--critical-the-service-role-key-ships-to-the-browser)
- [3. User provisioning and the invite flow](#3-user-provisioning-and-the-invite-flow)
- [4. Login and session bootstrap](#4-login-and-session-bootstrap)
- [5. The onboarding gate (`Invited` status)](#5-the-onboarding-gate-invited-status)
- [6. Password lifecycle](#6-password-lifecycle)
- [7. Session persistence and idle timeout](#7-session-persistence-and-idle-timeout)
- [8. Roles, role switching, and the active-role contract](#8-roles-role-switching-and-the-active-role-contract)
- [9. Route guards (client side)](#9-route-guards-client-side)
- [10. Database-side authorization (the real boundary)](#10-database-side-authorization-the-real-boundary)
- [11. Row Level Security coverage](#11-row-level-security-coverage)
- [12. Residual risk register](#12-residual-risk-register)

**Related chapters:** [01 — Architecture](01-architecture.md) · [03 — Data Model](03-data-model.md) · [14 — Pros & Cons](14-assessment-pros-cons.md)

---

## 1. The two Supabase clients

| Client | File | Key | Purpose |
|---|---|---|---|
| Anon client | [supabase.client.ts](../../src/services/supabase.client.ts) | `VITE_SUPABASE_ANON_KEY` | Every normal call. Created with **no options**, so SDK defaults apply: `persistSession: true`, `autoRefreshToken: true`, session in `localStorage` under `sb-*-auth-token`. |
| Admin client | [supabase.admin.ts](../../src/services/supabase.admin.ts) | `VITE_SUPABASE_SERVICE_ROLE_KEY` | `auth.admin.*` operations only. Configured `autoRefreshToken: false`, `detectSessionInUrl: false`, `persistSession: false`, `storageKey: 'sb-admin-no-persist'`. Throws at import time if either env var is missing. |

The admin client's own inline comment reads: *"This client bypasses RLS. Use ONLY for admin functions like inviting users."*

---

## 2. 🚨 Critical: the service-role key ships to the browser

```ts
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
```

**Vite inlines every variable prefixed `VITE_` into the client bundle at build time.** The Supabase service-role key is therefore present, in plaintext, in JavaScript served to every visitor — including every student.

### What this means concretely

The service-role key bypasses Row Level Security entirely and carries full `auth.admin` privileges. Anyone who opens devtools, or simply fetches and greps the bundle, can:

- Read and write **every table** in the database, ignoring all RLS policies
- Call `auth.admin.*` — create users, delete users, change any password, mint sessions as any user
- Read every student's grades, every submission, the entire user table

**Nothing else in this chapter constrains an attacker holding this key.** The `fn_assert_role` guards in §10 are `SECURITY DEFINER` functions that check `auth.uid()` — but the attacker does not need to call them; they can query the tables directly.

### Where it is used

Four functions in `src/services/user.service.ts`: `inviteSingleUser`, `resendInvite`, `resetUserPassword`, `bulkProvisionUsers`.

### The fix, in brief

Every one of those four operations is an `auth.admin` call that must happen server-side. The correct shape is a Supabase Edge Function holding the service-role key as a **function secret** (never a `VITE_` variable), verifying the caller's JWT and asserting they hold `Admin`, then performing the invite. The pattern is already proven in this codebase — the `ai-assistant` Edge Function does exactly this with `GEMINI_API_KEY`. Deleting `supabase.admin.ts` and rotating the key are both required; rotating alone is insufficient while the code still reads a `VITE_` variable, and deleting alone is insufficient because the old key is already in every deployed bundle and any browser cache.

> **This is the single highest-priority item in the entire system.** It is also, framed correctly, a strong thesis finding — see [14 §A](14-assessment-pros-cons.md).

---

## 3. User provisioning and the invite flow

Admin creates users; users never self-register.

### Single invite — `inviteSingleUser(params)`

1. `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { first_name, last_name }, redirectTo: '${origin}/set-password' })`
2. `callRpc('fn_provision_single_user', { p_auth_id, p_email, p_first_name, p_last_name, p_role_code })` — creates the `public.users` row and the role grant.

> **Gaps**
> - **Not atomic.** If step 2 fails, an auth user exists with no profile row. That user's first login will make `fn_get_auth_context` raise `P0002`, and they are permanently stuck with no self-service recovery.
> - Both halves wrap in manual `useLoadingStore.show()/hide()` and **return errors without toasting**, because the auth half bypasses `callRpc`'s notify path.

### Bulk invite — `bulkProvisionUsers`

Invites sequentially in a `for` loop, collecting per-email errors, then calls `fn_bulk_provision_users` **once** with the successful set. CSV template download and upload are provided by the shared `BulkImportModal`.

---

## 4. Login and session bootstrap

### Login

[LoginPage.tsx](../../src/pages/auth/LoginPage.tsx) → `login(email, password)` in [auth.service.ts](../../src/services/auth.service.ts) → `supabase.auth.signInWithPassword` → on success `await initAuthSession()` → reads `useAppStore.getState().activeRole` **fresh** (deliberately, to dodge a stale closure) and navigates to that role's home, or `/unauthorized` when there is no role.

A `useEffect` also redirects an already-authenticated visitor away from `/login`. Errors render inline via local state, not a toast. `location.state.activationSuccess` renders *"Account activated successfully. Please sign in."*

> **Gaps** `LoginPage` keeps its **own local `ROLE_PATHS` map** — a duplicate of `ROLE_HOME` in `src/constants/role.constant.ts` that QA Phase 4 was specifically meant to eliminate.

### Bootstrap

`App.tsx` runs `initAuthSession()` once in a `useEffect`:

1. `supabase.auth.getSession()` → `store.setSession(session)`
2. No session → `store.clearSession()` and return
3. `getAuthContext()` → **`fn_get_auth_context`**
4. `store.setUserProfile(...)`, `store.setAvailableRoles(...)`, `store.resolveActiveRole()`

**`fn_get_auth_context()`** (`docs/sql/active-role-contract.sql`) is `SECURITY DEFINER`, `STABLE`, `SET search_path = public`. Raises `28000` when `auth.uid()` is null, `P0002` when no matching non-deleted `users` row exists. Returns:

```
{ user_id,
  profile { id, first_name, middle_name, last_name, suffix, preferred_name,
            email, mobile_number, avatar_url, status },
  roles [ { id, code, label } ],
  role_codes [] }
```

Roles come from `user_roles ⋈ roles` with `deleted_at IS NULL AND revoked_at IS NULL` on the grant.

> **Gaps**
> - **There is no `onAuthStateChange` subscription in `App.tsx`.** A token refresh, or a sign-out in another tab, does not update the Zustand store.
> - `initAuthSession` is not awaited at render time — `AppRouter` mounts immediately, so on a hard refresh the store briefly holds whatever `localStorage` persisted before the real check lands.

---

## 5. The onboarding gate (`Invited` status)

[AuthGuard.tsx](../../src/routes/guards/AuthGuard.tsx):

```
if (!session)                      → <Navigate replace to="/login" />
if (userProfile?.status === 'Invited' && pathname !== '/set-password')
                                   → <Navigate replace to="/set-password" />
```

> **Gaps**
> - `/set-password` is declared **outside** `AuthGuard` in `AppRouter.tsx`, so the guard's own `pathname !== '/set-password'` condition is unreachable in practice. The redirect still works; the condition is dead.
> - The gate reads `userProfile`, which is **not persisted**. After a page refresh it is `null` until `initAuthSession` resolves — so an `Invited` user briefly passes the gate and can see protected UI before being bounced.

---

## 6. Password lifecycle

| Flow | Implementation | Notes |
|---|---|---|
| **Set password / activation** | [SetPasswordPage.tsx](../../src/pages/auth/SetPasswordPage.tsx) | Waits for a session via `getSession()` **and** `onAuthStateChange` filtered to `SIGNED_IN \| PASSWORD_RECOVERY`. A 10-second timer flips to *"Your invite link may have expired or already been used."* with a **Restart Process** button. Rules: `minLength 8`, confirm-field equality. Submit → `auth.updateUser({ password })` → `callRpc('fn_activate_user')` → `logout()` → `/login` with `activationSuccess`. **The user is deliberately forced to sign in again after activating.** |
| **Forgot password (self-service)** | [ForgotPasswordPage.tsx](../../src/pages/auth/ForgotPasswordPage.tsx) | `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/set-password' })`. **The result is discarded** — always shows "Check your email…". Correct anti-enumeration behaviour, but it also hides genuine failures. |
| **Resend invite (admin)** | `resendInvite(email)` in `user.service.ts` | Row action, enabled only for non-`Active` users. |
| **Reset password (admin)** | `resetUserPassword(email)` | Row action, enabled only for `status === 'Active'`. **Byte-identical implementation to `resendInvite`** — both are `supabaseAdmin.auth.resetPasswordForEmail` → `/set-password`. They differ only in which row action calls them. |
| **Change password (signed in)** | `changeMyPassword` in `profile.service.ts` | **Re-authenticates first** with `signInWithPassword(email, current_password)`, showing *"Your current password is incorrect."* on failure, then `updateUser({ password })`. Toasts by hand. |

---

## 7. Session persistence and idle timeout

### Persistence

Zustand `persist` writes key `au-jas-app` to `localStorage`, with `partialize` limited to `{ session, activeRole }`.

> **Gaps** Persisting the whole `Session` object — which contains the access **and refresh JWTs** — into a second `localStorage` key duplicates what the Supabase SDK already stores under its own key, and **this copy is never refreshed**. It can go stale relative to the SDK's live token, and it doubles the surface area for token theft via XSS.

### Idle timeout

`ProtectedLayout` uses `useIdleTimeout({ idleTime: 30 * 60 * 1000, countdownTime: 60 * 1000 })` — 30 minutes idle, then a 60-second `SessionTimeoutModal` before automatic logout. Activity events: `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll` (passive).

"Stay logged in" calls `supabase.auth.refreshSession()` and resets the timer — **the refresh result is ignored**, so a failed refresh leaves the user with a stale session and no signal. This is open item SF8.

`logout()` = `supabase.auth.signOut()` + `useAppStore.clearSession()`.

---

## 8. Roles, role switching, and the active-role contract

The five role codes are exactly `Admin` · `Faculty` · `Student` · `Registrar` · `Dean`.

### Switching

Each of the five layouts renders a `CommonSelect` of `availableRoles`, shown **only when `availableRoles.length > 1`**. On change: `setActiveRole(role)` then `navigate(ROLE_HOME[role], { replace: true })`. The `replace: true` was added by QA fix R3 so Back cannot bounce a user into the previous role's subtree and re-trigger the guard.

### The contract that isn't enforced

`docs/sql/active-role-contract.sql` defines **`fn_assert_active_role(p_active_role text)`** — returns a soft `{success: false, message}` for a blank role or a role the caller does not hold, else `{success: true, active_role}`. Comparison is case- and whitespace-insensitive.

> **Gaps — this is a significant one**
> **`fn_assert_active_role` has zero call sites in `src/`.** The active role is chosen and enforced entirely client-side by `RoleGate` and the Zustand store. The contract function exists in the database and is never invoked.
>
> The practical consequence is subtler than "anyone can be an admin", and worth stating precisely: what protects the data is that every RPC re-derives the caller's roles from `fn_current_user_role_codes()` — the database checks **held** roles, never the **selected** one. So tampering with `localStorage.activeRole` grants nothing you don't already hold. But it does mean **a multi-role user acting as "Faculty" is still authorised by the database to do anything their Dean role permits.** The §10 single-responsibility separation is a UI convention, not an enforced boundary.

---

## 9. Route guards (client side)

| Guard | Behaviour |
|---|---|
| `AuthGuard` | No session → `/login`. `Invited` status → `/set-password`. |
| `RoleGate` | No `activeRole` → `/unauthorized`. Role not in `allowedRoles` → **`ROLE_HOME[activeRole]`**, *not* `/unauthorized` (QA fix R3, so a legitimate multi-role user is never dead-ended). |
| `RoleRedirect` | No `activeRole` → `/login`, else `ROLE_HOME[activeRole]`. |
| `UnauthorizedPage` | 403 screen with "Go Back" (`navigate(-1)`) and "Go to My Dashboard" — the latter derives the path by `activeRole.toLowerCase()`, a third independent role→path derivation. |

> **Gaps** All five role subtrees ship in one bundle. `RoleGate` prevents rendering, not access. Every real boundary is in the database.

---

## 10. Database-side authorization (the real boundary)

The model is **guard-function-first, RLS-second**.

### Guard primitives — `docs/sql/rbac-guard.sql`

| Function | Behaviour |
|---|---|
| `fn_current_user_role_codes() → text[]` | `SECURITY DEFINER`, `STABLE`. `array_agg(DISTINCT r.code)` from `user_roles ⋈ roles` where role, grant, and `revoked_at` are all clean. Returns `ARRAY[]::text[]` when empty — never NULL. |
| `fn_assert_role(VARIADIC p_roles text[]) → void` | Raises **`28000`** *"Unauthorized: you must be signed in…"* when `auth.uid()` is null. Raises **`42501`** *"Forbidden: this action requires one of the following roles: X."* when the intersection is empty. Compares `lower(btrim(...))` on both sides. |

Both are `REVOKE ... FROM anon; GRANT ... TO authenticated`.

### Section-scoped guards — `docs/sql/security-retrofit.sql` (2,424 lines)

This file *is* the Phase 7 security retrofit. It defines:

| Function | Semantics |
|---|---|
| `fn_assert_section_staff(p_section_id)` | **Raise-style.** Passes for the section's own faculty **or** any Dean/Registrar/Admin. Raises `42501`. Also raises when `p_section_id IS NULL` — this NULL case is what produced the B7 "Forbidden on refetch" bug. |
| `fn_can_access_section_staff(p_section_id) → boolean` | Same allow-set, **no raise**. Added by the B7 fix so reads can soft-deny. |
| `fn_is_section_faculty(p_section_id) → boolean` | Owner-only. |
| `fn_can_access_section(p_section_id) → boolean` | Includes enrolled students. Used by content/discussion RLS. |
| `fn_owns_submission(p_submission_id) → boolean` | Student ownership via `assessment_submissions ⋈ enrollments ⋈ students.user_id = auth.uid()`. |
| `fn_assert_enrollment_access(p_enrollment_id)` | Resolves the enrollment's section and whether the caller is the owning student. |

It then **re-creates ~47 existing RPCs** with a `PERFORM public.fn_assert_role(...)` (37 occurrences) or a section/enrollment guard prepended, plus `SET search_path = public`. Functions hardened include `fn_advance_term_status`, `fn_bulk_enroll_student(s)`, `fn_bulk_provision_users`, `fn_calculate_all_grades_for_period`, `fn_get_grade_report`, `fn_get_students`, `fn_get_system_settings`, `fn_list_enrollments_json`, `fn_list_grade_release_json`, `fn_submit_assessment`, `fn_record_heartbeat`, and the whole `fn_update_*` family.

The file contains **zero comments and zero `CREATE POLICY` statements** — it is pure function hardening.

### The definer holes — `docs/sql/rbac-fix-definer-holes.sql`

Two `SECURITY DEFINER` functions the retrofit missed, both of which leaked cross-section data to any authenticated user:

| Function | Was | Now |
|---|---|---|
| `fn_list_grade_sheet` | No caller check at all. Any student could call it from the browser console with an arbitrary `section_id` and read a whole class's grades. | Raises `42501 'Forbidden: you do not have access to this section grade sheet.'` unless section faculty or Dean/Registrar/Admin. |
| `fn_list_section_students` | Same. | Raises `42501 'Forbidden: you do not have access to this section roster.'` |

**The name of the file is itself the finding:** `SECURITY DEFINER` bypasses RLS, and PostgreSQL grants `EXECUTE` to `PUBLIC` by default. A definer function without an internal caller check is a complete authorization bypass.

---

## 11. Row Level Security coverage

RLS is applied **selectively**, only to the newer feature tables — 52 `CREATE POLICY` statements across 9 files:

| SQL file | Tables | Policies |
|---|---|---|
| `content.sql` | `modules`, `course_materials`, `material_completions` | 9 |
| `learning-analytics-foundation.sql` | `competencies`, `assessment_question_competencies`, `competency_alignments` | 9 |
| `rubrics.sql` | `rubrics`, `rubric_criteria`, `rubric_evaluations` | 7 |
| `announcements.sql` | `announcement_sections` | 6 |
| `discussion.sql` | `discussion_threads`, `discussion_posts` | 6 |
| `events.sql` | `events`, `event_sections` | 6 |
| `academic-thresholds.sql` | `academic_thresholds` | 3 |
| `evaluation-sections.sql` | `evaluation_template_programs` | 3 |
| `records-academic.sql` | `student_lifecycle_events` | 3 |

The dominant shape is `USING (deleted_at IS NULL AND fn_can_access_section(section_id))` for reads and `WITH CHECK (fn_is_section_faculty(section_id))` for writes.

**The older ~40 tables have no RLS policies.** This is not immediately exploitable through the app — because every RPC is `SECURITY DEFINER` and therefore bypasses RLS anyway, and the frontend never issues a bare table query — but it means RLS provides no defence-in-depth for the majority of the schema. Combined with the finding in §2, it means the service-role key grants unrestricted access to almost everything.

---

## 12. Residual risk register

Ordered by severity.

| # | Risk | Severity | Notes |
|---|---|---|---|
| 1 | **Service-role key in the client bundle** | 🔴 Critical | §2. Defeats every other control. Requires a code change *and* a key rotation. |
| 2 | **No migration runner; live DB drifts from `docs/sql`** | 🔴 High | The security posture documented here is the *intent*. Already-observed drift: `fn_update_user` (wrong arity live), `fn_create_term` (7 vs 8 params), duplicate `fn_list_school_years_json` overloads. **The hardening in `security-retrofit.sql` cannot be assumed live without verification.** |
| 3 | **Definer-without-guard is an unprevented failure mode** | 🟠 Medium | Two instances were found and fixed. Nothing structurally prevents the next one — no lint rule, no test, no CI check for "definer function without a caller check". |
| 4 | **Active role not enforced server-side** | 🟠 Medium | §8. A multi-role user gets the union of all their roles' capabilities regardless of which role they've selected. |
| 5 | **Two coexisting denial conventions** | 🟠 Medium | Some RPCs `RAISE 42501`, others return a soft `{success:false}`. Attendance was normalised to soft-only by the B7 fix; the rest of the codebase is still mixed, so identical failures render differently on different screens. |
| 6 | **Inconsistent ownership predicates for the same resource** | 🟠 Medium | Attendance *writes* use `fn_is_section_faculty` (owner-only); `fn_calculate_all_grades_for_period` uses `fn_assert_section_staff` (owner or Dean/Registrar/Admin); assessment publish/unpublish uses a raw inline `sections.faculty_id = auth.uid()`. Three predicates, no single source of truth. |
| 7 | **Non-atomic invite** | 🟡 Low-Medium | §3. Orphaned auth users with no profile row are unrecoverable without manual DB intervention. |
| 8 | **Session JWTs duplicated into a second `localStorage` key** | 🟡 Low-Medium | §7. Stale copy, doubled XSS surface. |
| 9 | **No `onAuthStateChange` subscription** | 🟡 Low | §4. Cross-tab sign-out and token refresh don't propagate to the store. |
| 10 | **Dynamic SQL inside a definer function** | 🟡 Low | `fn_list_section_students` builds its WHERE clause with `format(... %L ...)`. `%L` quotes correctly so it is **not injectable as written**, but it is a fragile pattern inside a privilege-elevated function. |
| 11 | **`inet_client_addr()` in `grade_audit_logs`** | 🟡 Low | Behind Supabase's connection pooler this records the pooler's address, not the user's. The audit trail's IP column is effectively useless. |
| 12 | **`Invited` gate briefly passes on refresh** | 🟡 Low | §5. `userProfile` is null until `initAuthSession` resolves. |
