# 09 — Shared Features

Features that are not owned by a single role: announcements, events, notifications, profile, discussion, file storage, and the (absent) internationalisation layer.

## Contents

- [1. Announcements](#1-announcements)
- [2. The audience-resolution core](#2-the-audience-resolution-core)
- [3. Events](#3-events)
- [4. Notifications](#4-notifications)
- [5. Profile](#5-profile)
- [6. Discussion](#6-discussion)
- [7. Storage](#7-storage)
- [8. Internationalisation — absent](#8-internationalisation--absent)
- [9. Shared-feature gaps summary](#9-shared-feature-gaps-summary)

**Related chapters:** [01 — Architecture](01-architecture.md) · [07 — Faculty](07-role-faculty.md) · [12 — Analytics & AI](12-analytics-and-ai.md)

---

## 1. Announcements

**Routes** `/{role}/announcement-management` · `/new` · `/:id` — available to **Admin, Dean, Registrar, and Faculty** (not Student, who only receives them).

**Files** `src/pages/shared/announcement-management/` — `index.tsx`, `AnnouncementDetailPage.tsx`, `AnnouncementForm.tsx`, `AnnouncementFilterForm.tsx`, `useAnnouncementTableConfig.tsx`, `useAnnouncementBasePath.ts`.

The `useAnnouncementBasePath` hook derives `/{role}/announcement-management` from the active role, which is what lets a single page serve four roles. The detail page uses the `EntityFormPage` shell — one of only two features that adopted the routed-record convention.

| Action | RPC |
|---|---|
| List | `fn_list_announcements_json` (`p_audience`, `p_is_pinned`, `p_mine_only`, + paging) |
| Personal feed | `fn_list_my_announcements_feed` |
| Get | `fn_get_announcement_by_id` |
| Section options | `fn_get_announcement_section_options` |
| Create / update | `fn_create_announcement` / `fn_update_announcement` |
| Delete / bulk delete | `fn_delete_announcement` / `fn_bulk_delete_announcements` |

Create and update send `p_section_ids: target_audience === 'Section' ? sanitizeUuidArray(section_ids) : null`.

`sanitizeUuidArray` (in `src/utils/uuid.util.ts`) trims, drops blank entries, and returns `null` when the result is empty. It was **QA fix B4**, which stopped `invalid input syntax for type uuid: ""` errors caused by the multi-select field's default emitting an empty string.

A faculty member posting to a `Section` audience can select **multiple sections in one post** — this is the announcements instance of the cross-section reuse principle.

---

## 2. The audience-resolution core

`docs/sql/audience-resolution-core.sql` — a single function that announcements, events, notifications, and dashboards all route through. This is roadmap item 0.3, built as a foundation before any consumer, and it is one of the better architectural decisions in the project.

### `fn_resolve_audience(p_audience, p_section_ids) → SETOF uuid`

`SECURITY DEFINER`, `STABLE`. Returns `DISTINCT u.id` for users that are `deleted_at IS NULL AND status = 'Active'` and match:

| Audience | Resolves to |
|---|---|
| `Global` | everyone active |
| `Faculty` | anyone holding the Faculty role via a clean, unrevoked grant |
| `Student` | anyone holding the Student role |
| `Section` | **enrolled students** (`enrollments.status = 'Enrolled'`) **OR the section's assigned faculty** |

`Section` requires `p_section_ids`.

### `fn_preview_audience(...)`

Returns `{success, audience, section_count, recipient_count}` so the author can see reach before posting. Guarded by `fn_assert_role('Admin','Dean','Registrar','Faculty')`, and refuses a `Section` audience with no sections selected.

### Grants

`fn_resolve_audience` is **REVOKEd from both `anon` and `authenticated`** — it is internal-only, callable solely by other definer functions. `fn_preview_audience` is granted to `authenticated`. This is correct and unusually careful.

> **Gaps** **Admin, Dean, and Registrar are not addressable audiences.** The enum offers only Global, Faculty, Student, and Section. There is no way to send an announcement to "all deans" or "the registrar's office" — it is either everyone or one of the two large populations.

---

## 3. Events

**Routes** `/{role}/event-management` · `/new` · `/:id` — same four roles, same `EntityFormPage` shell, same structure as announcements.

| Action | RPC |
|---|---|
| List | `fn_list_events_json` (adds `p_upcoming_only`) |
| Feed | `fn_list_my_events_feed` (`p_from`, `p_to` — date range, used by the dashboards) |
| Get | `fn_get_event_by_id` |
| Create / update | `fn_create_event` / `fn_update_event` |
| Delete / bulk delete | `fn_delete_event` / `fn_bulk_delete_events` |

Same `sanitizeUuidArray` treatment; `p_start_at` passes through `nullIfBlank`.

> **Gaps** **`p_all_day` is hardcoded `false`** in both create and update. The column exists, the RPC accepts it, and the UI never sets it — all-day events are not expressible.

---

## 4. Notifications

`NotificationBell` in the navbar, present on every authenticated page for every role.

| Action | RPC |
|---|---|
| List | `fn_list_my_notifications_json` (`p_page`, `p_size`, `p_unread_only`) |
| Unread count | `fn_get_unread_notification_count` |
| Mark read | `fn_mark_my_notifications_read` (`p_notification_ids`; `null` marks all) |

**All three are called with `{ silent: true }`** — no loading overlay, no toast.

For the unread-count poll this is the right call: a transient failure should not throw a toast at the user every interval. For the list fetch and mark-read it is more debatable — a failed mark-read leaves the badge stubbornly lit with no explanation.

> **Gaps**
> - A failed poll renders as **zero unread**, indistinguishable from genuinely having none (the SF6 class).
> - The retrofit also hardened a differently-named `fn_mark_notifications_read`, which **has no frontend caller** — two functions for one job, one of them dead.
> - There is **no notification store**. The bell manages its own state and refetches; nothing else in the app can trigger a refresh after an action that should produce a notification.

---

## 5. Profile

**Route** `/{role}/profile` — reachable for all five roles via the sidebar footer button.

Files: `src/pages/shared/profile/` — `index.tsx`, `ProfileDetailsForm.tsx`, `ChangePasswordForm.tsx`.

| Action | RPC |
|---|---|
| Load | `fn_get_my_profile` |
| Update | `fn_update_my_profile` — 15 params: first/middle/last/suffix/preferred name, mobile, address line 1 and 2, city, province, postal code, date of birth, gender, civil status, nationality |
| Change password | *(no RPC)* — hand-rolled, see below |

`changeMyPassword` in `profile.service.ts` **re-authenticates first** with `signInWithPassword(email, current_password)`, showing *"Your current password is incorrect."* on failure, then calls `updateUser({ password })`. It toasts by hand because it bypasses the wrapper.

This screen satisfies the "self-service name and password change for every role" requirement without any role-specific work — the QA pass found it already existed and marked the corresponding finding as needing no work.

---

## 6. Discussion

**Component** `src/pages/shared/discussion/SectionDiscussionPanel.tsx` (list + composer) and `DiscussionThreadView.tsx`.

Mounted as tab 7 of the faculty section detail page and as a tab on the student subject detail page — **the same component serves both**, with capability differences driven by a server-returned `can_moderate` flag.

| Action | RPC |
|---|---|
| List threads | `fn_list_section_threads_json` |
| Load thread | `fn_get_discussion_thread` — returns `can_moderate = fn_is_section_faculty(section_id)` |
| Create thread | `fn_create_thread` |
| Reply | `fn_reply_to_thread` |
| Pin / unpin | `fn_set_thread_pinned` |
| Resolve / unresolve | `fn_set_thread_resolved` |
| Mark post as answer | `fn_set_post_answer` |
| Delete thread / post | `fn_delete_thread` / `fn_delete_post` |

A thread row shows a pin icon, title, resolved check, a one-line body preview, and `author_name · date · {n} replies`. The composer requires both a title and a body (max 2000 chars) before Post enables.

**Permission model** (`docs/sql/discussion.sql`): RLS on both tables keyed on `fn_can_access_section`. Read and create require section access. **Delete thread, delete post, set-resolved, and mark-answer are allowed to the author OR section faculty. Pinning is faculty-only** — no author fallback. That is a sensible, deliberate split.

> **Gaps**
> - 🔴 **The list is hardcoded to page 1, size 50, with no pagination control and no search box.** Threads beyond the 50th are simply unreachable through the UI. `fn_list_section_threads_json` accepts `p_page`, `p_size`, `p_search`, and `p_sort`; the component passes `(sectionId, 1, 50, '', [])`. Every one of those capabilities is implemented server-side and thrown away.
> - Pin and resolve results are `await`ed but their errors are **ignored** in the component.

---

## 7. Storage

`src/services/storage.service.ts` — four buckets, one small module.

```ts
StorageBucket = 'logos' | 'avatars' | 'materials' | 'submissions'
```

| Function | Behaviour |
|---|---|
| `uploadFile({ bucket, path, file, upsert })` | After upload returns a **public URL for `logos`**, a **1-hour signed URL** for every other bucket |
| `getFileUrl(bucket, path, expiresIn = 3600)` | Same public/signed split |
| `deleteFile(bucket, path)` | — |
| `listFiles(bucket, folder)` | Returns `folder/name` strings |

| Bucket | Used for | Path pattern |
|---|---|---|
| `submissions` | Student answer files | `{submissionId}/{questionId}/{timestamp}_{filename}`, `upsert: false` |
| `materials` | Course materials **and** assessment attachments | `generateId()`-derived for materials; `assessments/{id}/…` for attachments |
| `logos` | Institution logo | fixed `logos/institution-logo.<ext>`, `upsert: true` |
| `avatars` | Declared, **no caller found** | — |

> **Gaps**
> - **All four functions bypass `callRpc` entirely.** They return `{data, error}` but **never toast and never show the loader**. This is open item SF8.
> - **`assessment.service.ts` reaches past this module** and calls `supabase.storage.from('materials')` directly, duplicating the signed-URL logic and returning `''` on failure — a silent empty string that renders as a broken link. (That code path is currently unreachable anyway; see the dead-code note in [07 §5](07-role-faculty.md).)
> - The `avatars` bucket is declared and unused — the profile page has an `avatar_url` field with no upload path.
> - **No file is ever deleted from `submissions`.** Removing an attachment from an answer clears the DB reference only. Storage grows monotonically.
> - The logo's fixed filename with `upsert: true` means every upload overwrites globally, with no size or dimension validation.

---

## 8. Internationalisation — absent

`react-i18next@^16.5.8` is a declared dependency. `vite.config.ts` defines an `@locales` alias pointing at `src/locales`.

**`src/locales` does not exist.** There are **zero occurrences** of `useTranslation`, `i18next`, or `@locales` anywhere in `src/`.

All UI copy is hardcoded English. The only locale-aware behaviour in the codebase is date formatting: `en-PH` in the attendance record list and the audit log, and bare `toLocaleString()` everywhere else (which follows the browser, not a configured locale).

`CLAUDE.md` §2 lists i18n as part of the tech stack. It is not implemented.

The `@themes` alias has the same problem — it points at `src/themes`, which also does not exist; theme code actually lives in `src/constants/theme/`.

---

## 9. Shared-feature gaps summary

| # | Gap | Impact |
|---|---|---|
| 1 | **Discussion capped at 50 threads, no search, no pagination** — all three implemented server-side and discarded | 🔴 Unusable in a busy section |
| 2 | **Storage functions bypass the wrapper entirely** — no toasts, no loader | 🟠 Silent failures on every upload |
| 3 | **Submission files are never deleted from storage** | 🟠 Monotonic growth |
| 4 | **Admin, Dean, and Registrar are not addressable announcement audiences** | 🟠 Cannot address staff |
| 5 | **Notification failures render as "zero unread"** | 🟠 |
| 6 | **`p_all_day` hardcoded false** — all-day events not expressible | 🟡 |
| 7 | `assessment.service.ts` duplicates storage logic and returns `''` on failure | 🟡 |
| 8 | `avatars` bucket declared with no caller; profile has no avatar upload | 🟡 |
| 9 | Discussion pin/resolve errors silently ignored | 🟡 |
| 10 | Duplicate `fn_mark_notifications_read` with no caller | ⚪ |
| 11 | **i18n declared in the stack and entirely unimplemented**; `@locales` and `@themes` aliases point at non-existent directories | ⚪ Documentation is wrong |
