# Deploying the 2026-11-04 and 2026-11-06 bug fixes

None of this has been applied yet. Do it in this order, then run the test guide (`QA-BREAK-IT-TEST-GUIDE.md`).

## 1. Back up the database first
Take a fresh dump the same way as `backups/20261030-pre-bugfix/` before applying anything.

## 2. Apply the migrations, in this exact order
Each one: `npm run db:apply supabase/migrations/<file>`. Stop at the first error and report it.

No two of these files change the same database function, so the order below (filename order) is safe.

| # | File | What it fixes |
|---|---|---|
| 1 | `20261104010000_block_self_deactivation.sql` | Admin cannot deactivate their own account |
| 2 | `20261104011000_school_year_bulk_delete_same_rule.sql` | Bulk delete of academic years uses the single-delete rule; cleans up orphan term types |
| 3 | `20261104012000_history_holidays_per_version.sql` | Old versions no longer show today's holidays |
| 4 | `20261104013000_keep_terms_and_periods_in_use.sql` | Can't remove a term with sections or a period with grades (large function, review it) |
| 5 | `20261104014000_department_delete_blocks_assigned_users.sql` | Can't delete a department with a dean or faculty assigned |
| 6 | `20261104015000_audit_log_manila_day_boundaries.sql` | Audit log date filter uses Philippine days |
| 7 | `20261104020000_section_management_fixes.sql` | Section program filter/sort, edit guards, schedule conflict check, CSV days/times, grading override |
| 8 | `20261104021000_grade_release_skips_drafts.sql` | Registrar can only release submitted grades; no past release schedule |
| 9 | `20261104022000_enrollment_workspace_fixes.sql` | One-call enrollment save, capacity lock, conflict reason stored, drop guards |
| 10 | `20261104023000_registrar_dashboard_counts.sql` | Students-enrolled count; correct distribution percentages |
| 11 | `20261104024000_program_year_level_limits.sql` | Program duration 1-6; year level limited by program |
| 12 | `20261104025000_course_import_and_type_checks.sql` | Course CSV department and prerequisite fixes; course type delete guard |
| 13 | `20261104026000_dean_dashboard_conflict_count.sql` | Dean dashboard conflict count |
| 14 | `20261104030000_assessment_draft_and_grading_checks.sql` | New assessments are drafts; publish checks; grading point limits |
| 15 | `20261104031000_gradebook_lock_and_submit_fixes.sql` | Calculate/Submit respect locks; raw grade capped 0-100 |
| 16 | `20261104032000_attendance_session_date_checks.sql` | No future or out-of-term attendance sessions |
| 17 | `20261104032100_create_module_with_status.sql` | **Required before the new frontend**: modules are created with their chosen status |
| 18 | `20261104040000_student_assessment_expiry_and_results.sql` | Expired attempts are finalized; results visible when no dates are set |
| 19 | `20261104041000_student_answer_upsert_partial_index.sql` | Safety change for answer saving (live already works; harmless) |
| 20 | `20261104042000_student_insight_course_units.sql` | Real course units for the What-If simulator |
| 21 | `20261106010000_deans_list_from_thresholds.sql` | Dean's List badge uses the school year's thresholds |
| 22 | `20261106010500_scheduled_publish_checks.sql` | A scheduled publish can't make an empty or mismatched assessment visible |
| 23 | `20261106011000_question_choices_in_place_and_rescore.sql` | Editing an answer key keeps answers linked and re-scores them |
| 24 | `20261106012000_notify_only_on_changes.sql` | No repeat notifications when re-saving grades or attendance |
| 25 | `20261106013000_grading_lock_on_submit_only.sql` | Components lock only after grades are submitted; calculate permission |
| 26 | `20261106014000_assessment_copy_skips_duplicates.sql` | Copying an assessment twice doesn't duplicate it |
| 27 | `20261106015000_module_copy_skips_duplicates.sql` | Copying a module twice doesn't duplicate it |
| 28 | `20261106020000_subject_grades_release_filter.sql` | Students never see draft or submitted grades |
| 29 | `20261106021000_convert_communication_item.sql` | Announcement ⇄ Event conversion in one step; old links keep working |
| 30 | `20261106030000_program_years_duration_1_to_6.sql` | Program create/update/import use 1-6 years |
| 31 | `20261106031000_deactivate_ends_sessions.sql` | Deactivating a user ends their sessions |
| 32 | `20261106032000_faculty_load_room_conflicts.sql` | Faculty Loading lists room clashes too |
| 33 | `20261106033000_return_grades_to_faculty.sql` | Registrar "Return to Faculty" with a reason |

## 3. Redeploy the edge function
`supabase/functions/admin-user-provision` changed (email edit order, resend invite on inactive users, per-row rate-limit messages).

```
npx supabase functions deploy admin-user-provision
```

## 4. Deploy the frontend
Only after step 2. Migration 17 is required (creating a lesson module fails without it), and 21, 23 and 25 must be in before testing faculty grading.
