import { GradingComponent, GradingPeriod } from '@type/faculty.type';
import { TransmutationRow } from '@type/grading-config.type';
import { RubricCriterionInput, RubricEvaluationInput } from '@type/rubric.type';
import {
    AssessmentItemRecord,
    AssessmentSubmissionRecord,
    checkIsSectionGradingLocked,
    evaluateCopyRubricToSections,
    evaluateSectionGradingReseed,
    evaluateSetAssessmentRubric,
    evaluateStudentRubricResultVisibility,
    processCalculateAllGradesForPeriod,
    processCalculateEnrollmentFinalGrade,
    processGradeSubmissionRubric,
    RecordedFinalGradeRecord,
    RubricEvaluationRecord,
    RubricRecord,
    SectionEnrollmentRecord,
    TargetSectionInfo,
    validateGradingComponentMutation,
    validateRubricStructure
} from '@utils/faculty-grading-workflows.util';
import { describe, expect, it } from 'vitest';

describe('Faculty & Student Deep Workflows: Grading, Period Locking & Rubric Evaluations', () => {
    const defaultTransmutationLadder: TransmutationRow[] = [
        { transmuted_grade: 1.00, min_percentage: 98, description: 'Excellent' },
        { transmuted_grade: 1.25, min_percentage: 95, description: 'Superior' },
        { transmuted_grade: 1.50, min_percentage: 92, description: 'Very Good' },
        { transmuted_grade: 1.75, min_percentage: 89, description: 'Good' },
        { transmuted_grade: 2.00, min_percentage: 86, description: 'Meritorious' },
        { transmuted_grade: 2.25, min_percentage: 83, description: 'Very Satisfactory' },
        { transmuted_grade: 2.50, min_percentage: 80, description: 'Satisfactory' },
        { transmuted_grade: 2.75, min_percentage: 77, description: 'Fairly Satisfactory' },
        { transmuted_grade: 3.00, min_percentage: 75, description: 'Passing' },
        { transmuted_grade: 5.00, min_percentage: 0, description: 'Failed' }
    ];

    const samplePeriods: GradingPeriod[] = [
        { id: 'period-prelim', name: 'Prelim', sequence: 1, weight: 20, start_date: null, end_date: null },
        { id: 'period-midterm', name: 'Midterm', sequence: 2, weight: 20, start_date: null, end_date: null },
        { id: 'period-semifinal', name: 'Semi-Finals', sequence: 3, weight: 20, start_date: null, end_date: null },
        { id: 'period-finals', name: 'Finals', sequence: 4, weight: 40, start_date: null, end_date: null }
    ];

    describe('1. Periodic Grade Calculation & Grade Sheet Generation', () => {
        const sectionId = 'sec-101';
        const periodId = 'period-prelim';

        const components: (GradingComponent & { gradingPeriodId: string })[] = [
            { id: 'comp-ww', gradingPeriodId: periodId, name: 'Written Works', weight: 30 },
            { id: 'comp-pt', gradingPeriodId: periodId, name: 'Performance Tasks', weight: 50 },
            { id: 'comp-exam', gradingPeriodId: periodId, name: 'Periodic Exam', weight: 20 }
        ];

        const studentA: SectionEnrollmentRecord = {
            id: 'en-student-a',
            studentId: 'st-1',
            sectionId,
            studentNumber: '2026-0001',
            fullName: 'Alice Dela Cruz',
            status: 'Enrolled'
        };

        const studentB: SectionEnrollmentRecord = {
            id: 'en-student-b',
            studentId: 'st-2',
            sectionId,
            studentNumber: '2026-0002',
            fullName: 'Bob Santos',
            status: 'Enrolled'
        };

        const assessmentItems: AssessmentItemRecord[] = [
            { id: 'ai-quiz-1', sectionId, gradingComponentId: 'comp-ww', title: 'Quiz 1', totalPoints: 50, showResultsAt: null, useRubricScoring: false },
            { id: 'ai-quiz-2', sectionId, gradingComponentId: 'comp-ww', title: 'Quiz 2', totalPoints: 50, showResultsAt: null, useRubricScoring: false },
            { id: 'ai-project', sectionId, gradingComponentId: 'comp-pt', title: 'Mini Project', totalPoints: 100, showResultsAt: null, useRubricScoring: true },
            { id: 'ai-exam', sectionId, gradingComponentId: 'comp-exam', title: 'Prelim Exam', totalPoints: 100, showResultsAt: null, useRubricScoring: false }
        ];

        it('should calculate accurate weighted component scores and transmuted grade for enrolled student', () => {
            // Student A scores:
            // Written Works: Quiz 1 (45/50) + Quiz 2 (45/50) = 90/100 -> (90/100)*30 = 27.0
            // Performance Tasks: Project (90/100) -> (90/100)*50 = 45.0
            // Exam: Exam (85/100) -> (85/100)*20 = 17.0
            // Total Raw = 27 + 45 + 17 = 89.00% -> Transmuted = 1.75
            const submissions: AssessmentSubmissionRecord[] = [
                { id: 'sub-1', assessmentItemId: 'ai-quiz-1', enrollmentId: studentA.id, status: 'Graded', rawScore: 45, finalScore: 45, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-2', assessmentItemId: 'ai-quiz-2', enrollmentId: studentA.id, status: 'Graded', rawScore: 45, finalScore: 45, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-3', assessmentItemId: 'ai-project', enrollmentId: studentA.id, status: 'Graded', rawScore: 90, finalScore: 90, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-4', assessmentItemId: 'ai-exam', enrollmentId: studentA.id, status: 'Graded', rawScore: 85, finalScore: 85, feedback: null, gradedAt: null, gradedBy: 'fac-1' }
            ];

            const calc = processCalculateEnrollmentFinalGrade(
                studentA,
                periodId,
                components,
                assessmentItems,
                submissions,
                defaultTransmutationLadder
            );

            expect(calc.success)
                .toBe(true);
            expect(calc.rawGrade)
                .toBe(89.00);
            expect(calc.transmutedGrade)
                .toBe(1.75);
            expect(calc.totalWeightUsed)
                .toBe(100);
        });

        it('should handle zero-point component without division by zero', () => {
            const compWithZero: (GradingComponent & { gradingPeriodId: string })[] = [
                { id: 'comp-ww', gradingPeriodId: periodId, name: 'Written Works', weight: 40 },
                { id: 'comp-pt', gradingPeriodId: periodId, name: 'Performance Tasks', weight: 60 }
            ];

            const emptyItems: AssessmentItemRecord[] = [
                { id: 'ai-pt', sectionId, gradingComponentId: 'comp-pt', title: 'Task 1', totalPoints: 50, showResultsAt: null, useRubricScoring: false }
            ];

            const submissions: AssessmentSubmissionRecord[] = [
                { id: 'sub-pt', assessmentItemId: 'ai-pt', enrollmentId: studentA.id, status: 'Graded', rawScore: 50, finalScore: 50, feedback: null, gradedAt: null, gradedBy: 'fac-1' }
            ];

            const calc = processCalculateEnrollmentFinalGrade(
                studentA,
                periodId,
                compWithZero,
                emptyItems,
                submissions,
                defaultTransmutationLadder
            );

            expect(calc.success)
                .toBe(true);
            // WW: 0 earned / 0 max = 0
            // PT: 50/50 * 60 = 60
            // Total Raw = (60 / 100) * 100 = 60.00% -> Transmuted = 5.00
            expect(calc.rawGrade)
                .toBe(60.00);
            expect(calc.transmutedGrade)
                .toBe(5.00);
        });

        it('should return error if no grading components exist for period', () => {
            const calc = processCalculateEnrollmentFinalGrade(
                studentA,
                'unconfigured-period',
                components,
                assessmentItems,
                [],
                defaultTransmutationLadder
            );

            expect(calc.success)
                .toBe(false);
            expect(calc.message)
                .toContain('No grading components found for this period');
        });

        it('should batch calculate all enrolled students and produce grade sheet rows & failures diagnostics', () => {
            const submissions: AssessmentSubmissionRecord[] = [
                { id: 'sub-a1', assessmentItemId: 'ai-quiz-1', enrollmentId: studentA.id, status: 'Graded', rawScore: 50, finalScore: 50, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-a2', assessmentItemId: 'ai-quiz-2', enrollmentId: studentA.id, status: 'Graded', rawScore: 50, finalScore: 50, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-a3', assessmentItemId: 'ai-project', enrollmentId: studentA.id, status: 'Graded', rawScore: 100, finalScore: 100, feedback: null, gradedAt: null, gradedBy: 'fac-1' },
                { id: 'sub-a4', assessmentItemId: 'ai-exam', enrollmentId: studentA.id, status: 'Graded', rawScore: 100, finalScore: 100, feedback: null, gradedAt: null, gradedBy: 'fac-1' }
            ];

            const { result, updatedGrades, gradeSheetRows } = processCalculateAllGradesForPeriod(
                sectionId,
                periodId,
                [studentA, studentB],
                components,
                assessmentItems,
                submissions,
                defaultTransmutationLadder
            );

            expect(result.success)
                .toBe(true);
            expect(result.processed)
                .toBe(2);
            expect(result.succeeded)
                .toBe(2);
            expect(result.failed)
                .toBe(0);
            expect(result.message)
                .toContain('Calculated grades for 2 student(s)');

            // Student A got 100% -> 1.00
            expect(updatedGrades.find((g) => g.enrollmentId === studentA.id)?.rawGrade)
                .toBe(100.00);
            expect(updatedGrades.find((g) => g.enrollmentId === studentA.id)?.transmutedGrade)
                .toBe(1.00);

            // Student B had no submissions -> 0% -> 5.00
            expect(updatedGrades.find((g) => g.enrollmentId === studentB.id)?.rawGrade)
                .toBe(0.00);
            expect(updatedGrades.find((g) => g.enrollmentId === studentB.id)?.transmutedGrade)
                .toBe(5.00);

            expect(gradeSheetRows.length)
                .toBe(2);
            expect(gradeSheetRows[0].status)
                .toBe('Draft');
        });
    });

    describe('2. Grading Period Locking & Reseed Gates', () => {
        const sectionId = 'sec-101';
        const periodId = 'period-prelim';
        const facultyId = 'fac-user-1';

        const recordedGrades: RecordedFinalGradeRecord[] = [
            {
                id: 'g-1',
                enrollmentId: 'en-1',
                sectionId,
                gradingPeriodId: periodId,
                rawGrade: 88.5,
                finalGrade: 88.5,
                transmutedGrade: 2.00,
                status: 'Draft'
            }
        ];

        const existingComponents: GradingComponent[] = [
            { id: 'c-1', name: 'Written Works', weight: 40 },
            { id: 'c-2', name: 'Performance Tasks', weight: 60 }
        ];

        it('should detect period as locked when recorded grades exist', () => {
            const isLocked = checkIsSectionGradingLocked(sectionId, periodId, recordedGrades);
            expect(isLocked)
                .toBe(true);

            const isMidtermLocked = checkIsSectionGradingLocked(sectionId, 'period-midterm', recordedGrades);
            expect(isMidtermLocked)
                .toBe(false);
        });

        it('should block creating components when period is locked', () => {
            const mutation = validateGradingComponentMutation(
                'create',
                sectionId,
                periodId,
                true,
                existingComponents,
                { name: 'Exam', weight: 20 }
            );

            expect(mutation.isValid)
                .toBe(false);
            expect(mutation.error)
                .toContain('This grading period is locked because grades have already been recorded');
        });

        it('should block updating or deleting components when period is locked', () => {
            const updateCheck = validateGradingComponentMutation(
                'update',
                sectionId,
                periodId,
                true,
                existingComponents,
                { componentId: 'c-1', name: 'WW Updated', weight: 35 }
            );
            expect(updateCheck.isValid)
                .toBe(false);
            expect(updateCheck.error)
                .toContain('This grading period is locked');

            const deleteCheck = validateGradingComponentMutation(
                'delete',
                sectionId,
                periodId,
                true,
                existingComponents,
                { componentId: 'c-1' }
            );
            expect(deleteCheck.isValid)
                .toBe(false);
            expect(deleteCheck.error)
                .toContain('This grading period is locked');
        });

        it('should reject creating a component when total weight would exceed 100%', () => {
            const mutation = validateGradingComponentMutation(
                'create',
                sectionId,
                'period-midterm',
                false, // unlocked
                existingComponents, // 40 + 60 = 100
                { name: 'Extra Credit', weight: 10 }
            );

            expect(mutation.isValid)
                .toBe(false);
            expect(mutation.error)
                .toContain('Total weight of grading components cannot exceed 100%');
        });

        it('should reject non-positive weights', () => {
            const mutation = validateGradingComponentMutation(
                'create',
                sectionId,
                'period-midterm',
                false,
                [],
                { name: 'Exam', weight: 0 }
            );
            expect(mutation.isValid)
                .toBe(false);
            expect(mutation.error)
                .toContain('Weight must be greater than 0%');
        });

        it('should evaluate reseed gate: skip locked periods and populated periods, seed empty unlocked periods', () => {
            const sectionComponents: (GradingComponent & { gradingPeriodId: string })[] = [
                { id: 'c-1', gradingPeriodId: periodId, name: 'Written Works', weight: 40 },
                { id: 'c-2', gradingPeriodId: periodId, name: 'Performance Tasks', weight: 60 }
            ];

            // Prelim is locked and has components. Midterm, Semifinal, Finals are empty and unlocked.
            const reseed = evaluateSectionGradingReseed(
                sectionId,
                facultyId,
                ['Faculty'],
                facultyId,
                samplePeriods,
                sectionComponents,
                recordedGrades
            );

            expect(reseed.success)
                .toBe(true);
            expect(reseed.seededPeriodsCount)
                .toBe(3); // Midterm, Semifinal, Finals
            expect(reseed.message)
                .toContain('Grading schema seeded from the institutional template for 3 period(s)');
        });

        it('should block reseed when all periods are locked or already have components', () => {
            const allPopulatedComponents: (GradingComponent & { gradingPeriodId: string })[] = samplePeriods.map((p) => ({
                id: `comp-${p.id}`,
                gradingPeriodId: p.id,
                name: 'Default Component',
                weight: 100
            }));

            const reseed = evaluateSectionGradingReseed(
                sectionId,
                facultyId,
                ['Faculty'],
                facultyId,
                samplePeriods,
                allPopulatedComponents,
                recordedGrades
            );

            expect(reseed.success)
                .toBe(false);
            expect(reseed.message)
                .toContain('Nothing to seed: every grading period already has components');
        });

        it('should enforce RBAC: deny faculty from reseeding a section taught by another teacher', () => {
            const reseed = evaluateSectionGradingReseed(
                sectionId,
                'intruder-faculty-id',
                ['Faculty'],
                facultyId, // actual teacher
                samplePeriods,
                [],
                []
            );

            expect(reseed.success)
                .toBe(false);
            expect(reseed.message)
                .toContain('Forbidden: you may only reset grading for your own section');
        });

        it('should allow Admin or Dean to reseed any section', () => {
            const adminReseed = evaluateSectionGradingReseed(
                sectionId,
                'admin-user-id',
                ['Admin'],
                facultyId,
                samplePeriods,
                [],
                []
            );

            expect(adminReseed.success)
                .toBe(true);
            expect(adminReseed.seededPeriodsCount)
                .toBe(4);
        });
    });

    describe('3. Rubric Builder & Validation Logic', () => {
        it('should validate valid rubric with criteria and compute total points', () => {
            const criteria: RubricCriterionInput[] = [
                { id: null, title: 'Code Quality', description: 'Clean architecture', max_points: 30 },
                { id: null, title: 'Test Coverage', description: 'Comprehensive unit tests', max_points: 40 },
                { id: null, title: 'Documentation', description: 'Complete docstrings', max_points: 30 }
            ];

            const validation = validateRubricStructure('Programming Assignment Rubric', criteria);
            expect(validation.isValid)
                .toBe(true);
            expect(validation.totalPoints)
                .toBe(100);
        });

        it('should reject rubric with empty title', () => {
            const criteria: RubricCriterionInput[] = [
                { id: null, title: 'Criterion 1', description: '', max_points: 20 }
            ];
            const validation = validateRubricStructure('   ', criteria);
            expect(validation.isValid)
                .toBe(false);
            expect(validation.error)
                .toContain('Rubric title is required');
        });

        it('should reject rubric with zero criteria', () => {
            const validation = validateRubricStructure('Valid Title', []);
            expect(validation.isValid)
                .toBe(false);
            expect(validation.error)
                .toContain('Add at least one criterion');
        });

        it('should reject criterion with non-positive max points', () => {
            const criteria: RubricCriterionInput[] = [
                { id: null, title: 'Presentation', description: '', max_points: 0 }
            ];
            const validation = validateRubricStructure('Title', criteria);
            expect(validation.isValid)
                .toBe(false);
            expect(validation.error)
                .toContain('Each criterion must have points greater than zero');
        });

        it('should reject criterion with empty title', () => {
            const criteria: RubricCriterionInput[] = [
                { id: null, title: '  ', description: '', max_points: 25 }
            ];
            const validation = validateRubricStructure('Title', criteria);
            expect(validation.isValid)
                .toBe(false);
            expect(validation.error)
                .toContain('Each criterion must have a title');
        });
    });

    describe('4. Assessment Rubric Attachment & Scoring Mode', () => {
        const assessmentSectionId = 'sec-101';
        const attachedRubric: RubricRecord = {
            id: 'rubric-1',
            sectionId: assessmentSectionId,
            title: 'Essay Rubric',
            description: null,
            totalPoints: 100,
            isActive: true,
            criteria: [
                { id: 'crit-1', title: 'Content', description: null, max_points: 50, sequence: 1 },
                { id: 'crit-2', title: 'Grammar', description: null, max_points: 50, sequence: 2 }
            ]
        };

        it('should allow attaching section rubric and enabling rubric scoring', () => {
            const evaluation = evaluateSetAssessmentRubric(assessmentSectionId, attachedRubric, true);
            expect(evaluation.isValid)
                .toBe(true);
        });

        it('should block enabling rubric scoring when rubric is null', () => {
            const evaluation = evaluateSetAssessmentRubric(assessmentSectionId, null, true);
            expect(evaluation.isValid)
                .toBe(false);
            expect(evaluation.error)
                .toContain('Attach a rubric before enabling rubric scoring');
        });

        it('should block attaching a rubric from another section (cross-section isolation)', () => {
            const foreignRubric: RubricRecord = {
                ...attachedRubric,
                sectionId: 'other-sec-999'
            };

            const evaluation = evaluateSetAssessmentRubric(assessmentSectionId, foreignRubric, false);
            expect(evaluation.isValid)
                .toBe(false);
            expect(evaluation.error)
                .toContain('Rubric does not belong to this section');
        });
    });

    describe('5. Submission Rubric Evaluation & Score Calculation', () => {
        const graderId = 'faculty-prof-x';
        const baseSubmission: AssessmentSubmissionRecord = {
            id: 'sub-essay-1',
            assessmentItemId: 'ai-essay',
            enrollmentId: 'en-1',
            status: 'Submitted',
            rawScore: null,
            finalScore: null,
            feedback: null,
            gradedAt: null,
            gradedBy: null
        };

        const rubric: RubricRecord = {
            id: 'rubric-essay',
            sectionId: 'sec-101',
            title: 'Research Paper Rubric',
            description: null,
            totalPoints: 100,
            isActive: true,
            criteria: [
                { id: 'crit-content', title: 'Content & Thesis', description: null, max_points: 40, sequence: 1 },
                { id: 'crit-sources', title: 'Sources & Citations', description: null, max_points: 30, sequence: 2 },
                { id: 'crit-writing', title: 'Clarity & Mechanics', description: null, max_points: 30, sequence: 3 }
            ]
        };

        it('should accurately grade submission using criteria evaluations and update status to Graded', () => {
            const evaluations: RubricEvaluationInput[] = [
                { criteria_id: 'crit-content', points_earned: 38, feedback: 'Strong argument and thesis' },
                { criteria_id: 'crit-sources', points_earned: 27, feedback: 'Good academic sources' },
                { criteria_id: 'crit-writing', points_earned: 29, feedback: 'Well structured' }
            ];

            const outcome = processGradeSubmissionRubric(
                baseSubmission,
                rubric,
                evaluations,
                'Excellent research paper overall!',
                graderId
            );

            expect(outcome.success)
                .toBe(true);
            expect(outcome.rawScore)
                .toBe(94); // 38 + 27 + 29
            expect(outcome.updatedSubmission?.status)
                .toBe('Graded');
            expect(outcome.updatedSubmission?.rawScore)
                .toBe(94);
            expect(outcome.updatedSubmission?.finalScore)
                .toBe(94);
            expect(outcome.updatedSubmission?.feedback)
                .toBe('Excellent research paper overall!');
            expect(outcome.updatedSubmission?.gradedBy)
                .toBe(graderId);
            expect(outcome.savedEvaluations?.length)
                .toBe(3);
        });

        it('should reject grading if points exceed criterion max points', () => {
            const invalidEvaluations: RubricEvaluationInput[] = [
                { criteria_id: 'crit-content', points_earned: 45, feedback: '' } // max is 40
            ];

            const outcome = processGradeSubmissionRubric(
                baseSubmission,
                rubric,
                invalidEvaluations,
                '',
                graderId
            );

            expect(outcome.success)
                .toBe(false);
            expect(outcome.message)
                .toContain('must be between 0 and 40');
        });

        it('should reject grading if criterion does not belong to the attached rubric', () => {
            const alienEvaluations: RubricEvaluationInput[] = [
                { criteria_id: 'foreign-criterion-uuid', points_earned: 10, feedback: '' }
            ];

            const outcome = processGradeSubmissionRubric(
                baseSubmission,
                rubric,
                alienEvaluations,
                '',
                graderId
            );

            expect(outcome.success)
                .toBe(false);
            expect(outcome.message)
                .toContain('A criterion does not belong to the attached rubric');
        });

        it('should reject grading if no rubric is attached', () => {
            const outcome = processGradeSubmissionRubric(
                baseSubmission,
                null,
                [],
                '',
                graderId
            );

            expect(outcome.success)
                .toBe(false);
            expect(outcome.message)
                .toContain('No rubric attached to this assessment');
        });
    });

    describe('6. Student Rubric Result Visibility & Security Withholding', () => {
        const assessmentItem: AssessmentItemRecord = {
            id: 'ai-eval-1',
            sectionId: 'sec-101',
            gradingComponentId: 'comp-1',
            title: 'Case Study',
            totalPoints: 100,
            showResultsAt: '2026-08-28T12:00:00Z',
            useRubricScoring: true
        };

        const rubric: RubricRecord = {
            id: 'rubric-cs',
            sectionId: 'sec-101',
            title: 'Case Study Rubric',
            description: null,
            totalPoints: 100,
            isActive: true,
            criteria: [
                { id: 'crit-analysis', title: 'Problem Analysis', description: null, max_points: 60, sequence: 1 },
                { id: 'crit-solution', title: 'Proposed Solution', description: null, max_points: 40, sequence: 2 }
            ]
        };

        const gradedSubmission: AssessmentSubmissionRecord = {
            id: 'sub-cs-1',
            assessmentItemId: assessmentItem.id,
            enrollmentId: 'en-1',
            status: 'Graded',
            rawScore: 92,
            finalScore: 92,
            feedback: 'Solid analysis',
            gradedAt: '2026-08-28T09:00:00Z',
            gradedBy: 'fac-1'
        };

        const evaluations: RubricEvaluationRecord[] = [
            { id: 'ev-1', submissionId: gradedSubmission.id, criteriaId: 'crit-analysis', pointsEarned: 55, feedback: 'Deep insight', evaluatedBy: 'fac-1', evaluatedAt: '2026-08-28T09:00:00Z' },
            { id: 'ev-2', submissionId: gradedSubmission.id, criteriaId: 'crit-solution', pointsEarned: 37, feedback: 'Practical recommendations', evaluatedBy: 'fac-1', evaluatedAt: '2026-08-28T09:00:00Z' }
        ];

        it('should withhold rubric points and feedback from student before show_results_at', () => {
            // Student checks at 10:00 AM (before 12:00 PM release date)
            const beforeRelease = new Date('2026-08-28T10:00:00Z');
            const view = evaluateStudentRubricResultVisibility(
                gradedSubmission,
                assessmentItem,
                rubric,
                evaluations,
                beforeRelease
            );

            expect(view.resultsAvailable)
                .toBe(false);
            expect(view.rawScore)
                .toBeNull();
            expect(view.finalScore)
                .toBeNull();
            expect(view.feedback)
                .toBeNull();

            // Rubric metadata is present for structure, but earned points & feedback are withheld (null)
            expect(view.rubricData?.criteria[0].points_earned)
                .toBeNull();
            expect(view.rubricData?.criteria[0].feedback)
                .toBeNull();
            expect(view.rubricData?.criteria[1].points_earned)
                .toBeNull();
            expect(view.rubricData?.criteria[1].feedback)
                .toBeNull();
        });

        it('should disclose rubric points and feedback to student after show_results_at', () => {
            // Student checks at 1:00 PM (after 12:00 PM release date)
            const afterRelease = new Date('2026-08-28T13:00:00Z');
            const view = evaluateStudentRubricResultVisibility(
                gradedSubmission,
                assessmentItem,
                rubric,
                evaluations,
                afterRelease
            );

            expect(view.resultsAvailable)
                .toBe(true);
            expect(view.rawScore)
                .toBe(92);
            expect(view.finalScore)
                .toBe(92);
            expect(view.feedback)
                .toBe('Solid analysis');

            expect(view.rubricData?.criteria[0].points_earned)
                .toBe(55);
            expect(view.rubricData?.criteria[0].feedback)
                .toBe('Deep insight');
            expect(view.rubricData?.criteria[1].points_earned)
                .toBe(37);
            expect(view.rubricData?.criteria[1].feedback)
                .toBe('Practical recommendations');
        });

        it('should withhold rubric points if submission is still In Progress or Submitted (not yet Graded)', () => {
            const pendingSubmission: AssessmentSubmissionRecord = {
                ...gradedSubmission,
                status: 'Submitted',
                rawScore: null,
                finalScore: null
            };

            const afterRelease = new Date('2026-08-28T13:00:00Z');
            const view = evaluateStudentRubricResultVisibility(
                pendingSubmission,
                assessmentItem,
                rubric,
                [],
                afterRelease
            );

            expect(view.resultsAvailable)
                .toBe(false);
            expect(view.rawScore)
                .toBeNull();
            expect(view.rubricData?.criteria[0].points_earned)
                .toBeNull();
        });
    });

    describe('7. Cross-Section Rubric Copying Security', () => {
        const facultyId = 'fac-prof-jones';
        const sourceRubric: RubricRecord = {
            id: 'rubric-source',
            sectionId: 'sec-cs101-a',
            title: 'Term Project Rubric',
            description: 'Comprehensive term project grading',
            totalPoints: 100,
            isActive: true,
            criteria: [
                { id: 'c-1', title: 'Architecture', description: null, max_points: 50, sequence: 1 },
                { id: 'c-2', title: 'Execution', description: null, max_points: 50, sequence: 2 }
            ]
        };

        it('should successfully copy rubric to target sections taught by the same faculty', () => {
            const targetSections: TargetSectionInfo[] = [
                { id: 'sec-cs101-b', facultyId, sectionCode: 'CS101-B' },
                { id: 'sec-cs101-c', facultyId, sectionCode: 'CS101-C' }
            ];

            const outcome = evaluateCopyRubricToSections(
                sourceRubric,
                facultyId,
                targetSections,
                facultyId
            );

            expect(outcome.success)
                .toBe(true);
            expect(outcome.copiedCount)
                .toBe(2);
            expect(outcome.newRubrics?.length)
                .toBe(2);
            expect(outcome.newRubrics?.[0].sectionId)
                .toBe('sec-cs101-b');
            expect(outcome.newRubrics?.[0].criteria.length)
                .toBe(2);
            expect(outcome.newRubrics?.[1].sectionId)
                .toBe('sec-cs101-c');
        });

        it('should reject copying if caller is not the faculty of the source section', () => {
            const targetSections: TargetSectionInfo[] = [
                { id: 'sec-cs101-b', facultyId, sectionCode: 'CS101-B' }
            ];

            const outcome = evaluateCopyRubricToSections(
                sourceRubric,
                facultyId,
                targetSections,
                'unauthorized-faculty-id'
            );

            expect(outcome.success)
                .toBe(false);
            expect(outcome.message)
                .toContain('Forbidden: you do not teach the source section');
        });

        it('should reject copying if caller does not teach one of the target sections', () => {
            const targetSections: TargetSectionInfo[] = [
                { id: 'sec-cs101-b', facultyId, sectionCode: 'CS101-B' },
                { id: 'sec-cs101-d', facultyId: 'other-prof-smith', sectionCode: 'CS101-D' }
            ];

            const outcome = evaluateCopyRubricToSections(
                sourceRubric,
                facultyId,
                targetSections,
                facultyId
            );

            expect(outcome.success)
                .toBe(false);
            expect(outcome.message)
                .toContain('Forbidden: you do not teach every target section');
        });

        it('should skip source section if accidentally included in target list', () => {
            const targetSections: TargetSectionInfo[] = [
                { id: 'sec-cs101-a', facultyId, sectionCode: 'CS101-A' }, // source itself
                { id: 'sec-cs101-b', facultyId, sectionCode: 'CS101-B' }
            ];

            const outcome = evaluateCopyRubricToSections(
                sourceRubric,
                facultyId,
                targetSections,
                facultyId
            );

            expect(outcome.success)
                .toBe(true);
            expect(outcome.copiedCount)
                .toBe(1);
            expect(outcome.newRubrics?.[0].sectionId)
                .toBe('sec-cs101-b');
        });
    });
});