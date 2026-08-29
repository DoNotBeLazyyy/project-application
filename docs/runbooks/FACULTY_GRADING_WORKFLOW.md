# AU-JAS LMS Operational Runbook: Faculty Continuous Grading & Transmutation Workflow

## 1. Architectural Overview & Grading Paradigm

The **AU-JAS LMS** employs a **Continuous Grading & Transmutation Engine** governed by a strict **"Thick Database, Thin Client"** architecture:
- **Presentation Layer**: The React frontend (`/faculty/sections/:id?tab=grades`) serves strictly as an input capture and preview surface.
- **Computation Authority**: All percentage weightings, component aggregations, transmutation scales, and locking validations are executed directly in PostgreSQL stored procedures (`fn_calculate_all_grades_for_period`, `fn_calculate_final_grade`, `fn_save_transmutation_table`).
- **Data Integrity**: Grade modifications produce immutable audit records in `grade_audit_logs`.

---

## 2. Grading Scheme Configuration & Inheritance

### Default Institutional Template vs Section Customization
1. **Institutional Default Inheritance**:
   - Each academic department configures standard grading period templates (Prelim, Midterm, Semi-Finals, Finals) and components (Written Works, Performance Tasks, Periodic Exams).
   - When a new section is created, it automatically inherits the active institutional template.
2. **Re-seeding Grading Schema**:
   - If a faculty member needs to reset their section grading components to the department baseline, execute **Reseed Grading** (`fn_reseed_section_grading`).
3. **The 100% Weight Invariant**:
   - The sum of component weights within any grading period **must equal exactly 100%**:
     $$\sum_{i=1}^{n} \text{Weight}_i = 100\%$$
   - Any attempt to save component weights exceeding or falling below 100% is blocked at the database level with a validation constraint error.

```text
┌─────────────────────────────────────────────────────────────┐
│                    GRADING PERIOD: MIDTERMS                 │
├──────────────────────────────┬──────────────────────────────┤
│ Component Name               │ Weight (%)                   │
├──────────────────────────────┼──────────────────────────────┤
│ 1. Written Works (Quizzes)   │ 25%                          │
│ 2. Performance Tasks (Labs)  │ 45%                          │
│ 3. Periodic Examination      │ 30%                          │
├──────────────────────────────┼──────────────────────────────┤
│ TOTAL                        │ 100% (Strict Invariant)      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 3. Assessment Construction & Component Association

1. **Creating Assessment Items**:
   - Navigate to `/faculty/sections/:id?tab=assessments` and click **Create Assessment**.
   - Select the target **Grading Period** (e.g. Midterm) and **Grading Component** (e.g. Performance Tasks).
   - Set total points, duration timer, and scheduling gates:
     - `scheduled_publish_at`: Visible in syllabus.
     - `opens_at`: Start of student test window.
     - `due_at`: Deadline for on-time submissions.
     - `closes_at`: Hard cutoff for late submissions.
     - `show_results_at`: Date when student answer keys and explanations are unlocked.
2. **Server-Side Answer Key Withholding**:
   - Before `show_results_at`, correct answers are suppressed in PostgreSQL (`CASE WHEN v_results_available THEN ... ELSE NULL END`). Students cannot inspect answers via DevTools.

---

## 4. Rubric Evaluation Workflow

1. **Building & Attaching Rubrics**:
   - Navigate to `/faculty/rubric-builder` or section rubric tab.
   - Define criteria titles, descriptions, and maximum point values (`validateRubricStructure`).
   - Attach the rubric to subjective assessments (Essays, Projects, Portfolios) via `fn_set_assessment_rubric`.
2. **Evaluating Submissions**:
   - Open student submission in `/faculty/sections/:id/assessments/:itemId/submissions`.
   - Score each criterion within authorized limits ($0 \le \text{pts} \le \text{max\_points}$).
   - Save grade via `fn_grade_submission_rubric`. The system automatically aggregates criterion points into the total raw score.
3. **Cross-Section Rubric Copying**:
   - Faculty teaching multiple section offerings of the same course can replicate rubrics using `fn_copy_rubric_to_sections`.

---

## 5. Continuous Grade Calculation & Transmutation Scale

### Step 1: Raw Percentage Calculation
For each grading period, the raw percentage grade is computed as the weighted sum of earned points across all components:

$$\text{Component Score} = \frac{\sum \text{Earned Points}}{\sum \text{Total Possible Points}} \times \text{Component Weight}$$

$$\text{Raw Period Grade} = \sum \text{Component Scores}$$

### Step 2: Transmutation to Institutional 10-Rung Scale
The raw percentage is mapped against the university's 10-rung fixed ladder (`transmutation-fixed-ladder.sql`):

| Minimum Percentage | Transmuted Grade | Performance Equivalent |
|---|---|---|
| **97.00% – 100.00%** | **1.00** | Excellent / Highest Honors |
| **94.00% – 96.99%** | **1.25** | Superior |
| **91.00% – 93.99%** | **1.50** | Very Good |
| **88.00% – 90.99%** | **1.75** | Good |
| **85.00% – 87.99%** | **2.00** | Above Average |
| **82.00% – 84.99%** | **2.25** | Average |
| **79.00% – 81.99%** | **2.50** | Satisfactory |
| **76.00% – 78.99%** | **2.75** | Fair |
| **75.00% – 75.99%** | **3.00** | Passing |
| **0.00% – 74.99%** | **5.00** | Failed |

---

## 6. Special Grades Handling

1. **`DRP` (Dropped due to Absences)**:
   - Evaluated dynamically via `evaluateSpecialGradeStatus` and attendance records.
   - If unexcused absences exceed the institutional threshold (e.g. $\ge 20\%$ of total course hours), student status converts to `DRP`.
2. **`INC` (Incomplete Requirements)**:
   - Assigned when a student has passing term marks but missed the major Periodic Examination or final capstone submission.
   - Triggers an automatic **365-day resolution clock**. If uncompleted after 1 calendar year, PostgreSQL automatically converts the record to `5.00` (Failed).

---

## 7. Batch Grade Calculation & Final Submission

1. **Batch Calculation**:
   - In the Section Grade Sheet, click **Calculate All Grades** to execute `fn_calculate_all_grades_for_period`.
   - The stored procedure loops through all actively enrolled students, computes raw percentages, maps transmutation rungs, and outputs the calculation summary.
2. **Reviewing Grade Distribution**:
   - Faculty inspect the Grade Sheet table, verifying outliers, passing rates, and special status flags.
3. **Locking & Submission**:
   - Once verified, click **Submit Grades to Registrar**.
   - Status changes from `Draft` to `Submitted`.
   - The section grading period is immediately locked (`fn_is_section_grading_locked = TRUE`), preventing further edits unless unlocked by the Registrar.

---

## 8. Troubleshooting & FAQ

- **Q: Why does "Calculate All Grades" fail for some students?**
  - *A*: Check if the student has missing submissions in components that do not allow zero-score defaulting, or if section component weights do not sum to 100%.
- **Q: Can I edit an assessment score after submitting grades?**
  - *A*: Once locked, edits require a formal amendment request to the Registrar. Upon unlocking, all modifications will be recorded in `grade_audit_logs`.
- **Q: How does student GWA update after grade release?**
  - *A*: GWA is recalculated immediately by `fn_get_student_insight` taking into account course credit units and transmuted grades.

