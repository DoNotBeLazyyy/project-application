import { SubmissionStatus } from '@type/assessment.type';
import {
    GradeCalculationFailure,
    GradeCalculationResult,
    GradeSheetRow,
    GradingComponent,
    GradingPeriod
} from '@type/faculty.type';
import { TransmutationRow } from '@type/grading-config.type';
import {
    RubricCriterion,
    RubricCriterionInput,
    RubricEvaluationInput,
    SubmissionRubric
} from '@type/rubric.type';
import { transmuteGrade } from '@utils/grading.util';

export interface RecordedFinalGradeRecord {
    id: string;
    enrollmentId: string;
    sectionId: string;
    gradingPeriodId: string;
    rawGrade: number;
    finalGrade: number;
    transmutedGrade: number | null;
    status: 'Draft' | 'Submitted' | 'Approved' | 'Released';
    remarks?: string;
}

export interface SectionEnrollmentRecord {
    id: string;
    studentId: string;
    sectionId: string;
    studentNumber: string;
    fullName: string;
    programId?: string | null;
    status: 'Enrolled' | 'Dropped' | 'Withdrawn';
}

export interface AssessmentItemRecord {
    id: string;
    sectionId: string;
    gradingComponentId: string | null;
    title: string;
    totalPoints: number;
    showResultsAt: string | null;
    useRubricScoring: boolean;
}

export interface AssessmentSubmissionRecord {
    id: string;
    assessmentItemId: string;
    enrollmentId: string;
    status: SubmissionStatus;
    rawScore: number | null;
    finalScore: number | null;
    feedback: string | null;
    gradedAt: string | null;
    gradedBy: string | null;
}

export interface RubricEvaluationRecord {
    id: string;
    submissionId: string;
    criteriaId: string;
    pointsEarned: number;
    feedback: string | null;
    evaluatedBy: string;
    evaluatedAt: string;
}

export interface RubricRecord {
    id: string;
    sectionId: string;
    title: string;
    description: string | null;
    totalPoints: number;
    isActive: boolean;
    criteria: RubricCriterion[];
}

export interface TargetSectionInfo {
    id: string;
    facultyId: string;
    sectionCode: string;
}

/**
 * 1. Checks if section grading for a specific grading period is locked.
 * Conforms to PostgreSQL: public.fn_is_section_grading_locked
 */
export function checkIsSectionGradingLocked(
    sectionId: string,
    gradingPeriodId: string,
    recordedGrades: RecordedFinalGradeRecord[]
): boolean {
    return recordedGrades.some(
        (g) => g.sectionId === sectionId && g.gradingPeriodId === gradingPeriodId
    );
}

/**
 * 2. Validates grading component mutation against locking and weight capacity limits.
 * Conforms to PostgreSQL: fn_create_grading_component, fn_update_grading_component, fn_delete_grading_component
 */
export function validateGradingComponentMutation(
    action: 'create' | 'update' | 'delete',
    sectionId: string,
    gradingPeriodId: string,
    isLocked: boolean,
    existingComponents: GradingComponent[],
    payload?: { componentId?: string; name?: string; weight?: number }
): { isValid: boolean; error?: string } {
    if (isLocked) {
        return {
            isValid: false,
            error: 'This grading period is locked because grades have already been recorded. Components can no longer be changed.'
        };
    }

    if (action === 'delete') {
        return { isValid: true };
    }

    const proposedWeight = Number(payload?.weight) || 0;
    if (proposedWeight <= 0) {
        return { isValid: false, error: 'Weight must be greater than 0%.' };
    }

    const otherComponents = existingComponents.filter(
        (c) => c.id !== payload?.componentId
    );
    const otherWeightSum = otherComponents.reduce((sum, c) => sum + c.weight, 0);

    if (otherWeightSum + proposedWeight > 100) {
        return {
            isValid: false,
            error: 'Total weight of grading components cannot exceed 100%.'
        };
    }

    return { isValid: true };
}

/**
 * 3. Evaluates Section Grading Reseed from institutional template.
 * Conforms to PostgreSQL: fn_reseed_section_grading
 */
export function evaluateSectionGradingReseed(
    sectionId: string,
    userId: string,
    userRoles: string[],
    sectionFacultyId: string,
    periods: GradingPeriod[],
    existingComponents: (GradingComponent & { gradingPeriodId: string })[],
    recordedGrades: RecordedFinalGradeRecord[]
): { success: boolean; message: string; seededPeriodsCount: number } {
    const isStaffOrAdmin = userRoles.includes('Admin') || userRoles.includes('Dean');
    if (!isStaffOrAdmin && sectionFacultyId !== userId) {
        return {
            success: false,
            message: 'Forbidden: you may only reset grading for your own section.',
            seededPeriodsCount: 0
        };
    }

    let seededCount = 0;
    for (const period of periods) {
        const isLocked = checkIsSectionGradingLocked(sectionId, period.id, recordedGrades);
        if (isLocked) continue;

        const hasComponents = existingComponents.some(
            (c) => c.gradingPeriodId === period.id
        );
        if (hasComponents) continue;

        seededCount += 1;
    }

    if (seededCount === 0) {
        return {
            success: false,
            message: 'Nothing to seed: every grading period already has components or is locked by recorded grades.',
            seededPeriodsCount: 0
        };
    }

    return {
        success: true,
        message: `Grading schema seeded from the institutional template for ${seededCount} period(s).`,
        seededPeriodsCount: seededCount
    };
}

/**
 * 4. Calculates a single student enrollment's final grade for a grading period.
 * Conforms to PostgreSQL: fn_calculate_final_grade
 */
export function processCalculateEnrollmentFinalGrade(
    enrollment: SectionEnrollmentRecord,
    gradingPeriodId: string,
    components: (GradingComponent & { gradingPeriodId: string })[],
    assessmentItems: AssessmentItemRecord[],
    submissions: AssessmentSubmissionRecord[],
    transmutationLadder: TransmutationRow[]
): {
    success: boolean;
    message: string;
    rawGrade?: number;
    transmutedGrade?: number | null;
    totalWeightUsed?: number;
} {
    const periodComponents = components.filter(
        (c) => c.gradingPeriodId === gradingPeriodId
    );

    if (periodComponents.length === 0) {
        return {
            success: false,
            message: 'No grading components found for this period.'
        };
    }

    let totalWeight = 0;
    let totalWeightedScore = 0;

    for (const comp of periodComponents) {
        const compItems = assessmentItems.filter(
            (item) => item.gradingComponentId === comp.id
        );

        let earnedScore = 0;
        let maxScore = 0;

        for (const item of compItems) {
            const sub = submissions.find(
                (s) =>
                    s.assessmentItemId === item.id
                    && s.enrollmentId === enrollment.id
                    && s.status === 'Graded'
            );

            if (sub && sub.finalScore !== null && sub.finalScore !== undefined) {
                earnedScore += sub.finalScore;
                maxScore += item.totalPoints;
            }
        }

        const compWeighted = maxScore > 0
            ? (earnedScore / maxScore) * comp.weight
            : 0;
        totalWeight += comp.weight;
        totalWeightedScore += compWeighted;
    }

    if (totalWeight === 0) {
        return {
            success: false,
            message: 'No valid grading components with weight found for this period.'
        };
    }

    const rawGrade = Number(((totalWeightedScore / totalWeight) * 100).toFixed(2));
    const transmutedGrade = transmuteGrade(rawGrade, transmutationLadder);

    return {
        success: true,
        message: 'Grade calculated and saved successfully.',
        rawGrade,
        transmutedGrade,
        totalWeightUsed: totalWeight
    };
}

/**
 * 5. Batch calculates grades for all enrolled students in a section for a grading period.
 * Conforms to PostgreSQL: fn_calculate_all_grades_for_period
 */
export function processCalculateAllGradesForPeriod(
    sectionId: string,
    gradingPeriodId: string,
    enrollments: SectionEnrollmentRecord[],
    components: (GradingComponent & { gradingPeriodId: string })[],
    assessmentItems: AssessmentItemRecord[],
    submissions: AssessmentSubmissionRecord[],
    transmutationLadder: TransmutationRow[]
): {
    result: GradeCalculationResult;
    updatedGrades: RecordedFinalGradeRecord[];
    gradeSheetRows: GradeSheetRow[];
} {
    const activeEnrollments = enrollments.filter(
        (e) => e.sectionId === sectionId && e.status === 'Enrolled'
    );

    let successCount = 0;
    let failureCount = 0;
    const failures: GradeCalculationFailure[] = [];
    const updatedGrades: RecordedFinalGradeRecord[] = [];
    const gradeSheetRows: GradeSheetRow[] = [];

    for (const enrollment of activeEnrollments) {
        const calc = processCalculateEnrollmentFinalGrade(
            enrollment,
            gradingPeriodId,
            components,
            assessmentItems,
            submissions,
            transmutationLadder
        );

        if (calc.success && calc.rawGrade !== undefined) {
            successCount += 1;

            const gradeRecord: RecordedFinalGradeRecord = {
                id: `grade-${enrollment.id}-${gradingPeriodId}`,
                enrollmentId: enrollment.id,
                sectionId,
                gradingPeriodId,
                rawGrade: calc.rawGrade,
                finalGrade: calc.rawGrade,
                transmutedGrade: calc.transmutedGrade ?? null,
                status: 'Draft',
                remarks: 'Auto-calculated via fn_calculate_final_grade'
            };
            updatedGrades.push(gradeRecord);

            gradeSheetRows.push({
                enrollment_id: enrollment.id,
                student_number: enrollment.studentNumber,
                full_name: enrollment.fullName,
                raw_grade: calc.rawGrade,
                final_grade: calc.rawGrade,
                transmuted_grade: calc.transmutedGrade ?? null,
                status: 'Draft',
                special_grade: null
            });
        }
        else {
            failureCount += 1;
            failures.push({
                enrollment_id: enrollment.id,
                student_number: enrollment.studentNumber,
                full_name: enrollment.fullName,
                reason: calc.message
            });

            gradeSheetRows.push({
                enrollment_id: enrollment.id,
                student_number: enrollment.studentNumber,
                full_name: enrollment.fullName,
                raw_grade: null,
                final_grade: null,
                transmuted_grade: null,
                status: null,
                special_grade: null
            });
        }
    }

    const processed = successCount + failureCount;
    let message = '';
    if (processed === 0) {
        message = 'No enrolled students in this section to calculate.';
    }
    else if (failureCount === 0) {
        message = `Calculated grades for ${successCount} student(s).`;
    }
    else if (successCount === 0) {
        message = `No grades could be calculated. All ${failureCount} student(s) failed.`;
    }
    else {
        message = `Calculated ${successCount} of ${processed} student(s). ${failureCount} could not be computed.`;
    }

    return {
        result: {
            success: true,
            message,
            processed,
            succeeded: successCount,
            failed: failureCount,
            failures
        },
        updatedGrades,
        gradeSheetRows
    };
}

/**
 * 6. Validates rubric title and criteria structure for creation/updates.
 * Conforms to PostgreSQL: fn_create_rubric, fn_update_rubric
 */
export function validateRubricStructure(
    title: string,
    criteria: RubricCriterionInput[]
): { isValid: boolean; error?: string; totalPoints?: number } {
    if (!title || title.trim() === '') {
        return { isValid: false, error: 'Rubric title is required.' };
    }

    if (!criteria || criteria.length === 0) {
        return { isValid: false, error: 'Add at least one criterion.' };
    }

    let totalPoints = 0;
    for (const c of criteria) {
        if (!c.title || c.title.trim() === '') {
            return { isValid: false, error: 'Each criterion must have a title.' };
        }
        const maxPts = Number(c.max_points);
        if (isNaN(maxPts) || maxPts <= 0) {
            return {
                isValid: false,
                error: 'Each criterion must have points greater than zero.'
            };
        }
        totalPoints += maxPts;
    }

    return { isValid: true, totalPoints };
}

/**
 * 7. Evaluates assessment rubric attachment rules.
 * Conforms to PostgreSQL: fn_set_assessment_rubric
 */
export function evaluateSetAssessmentRubric(
    assessmentSectionId: string,
    rubric: RubricRecord | null,
    useScoring: boolean
): { isValid: boolean; error?: string } {
    if (useScoring && !rubric) {
        return {
            isValid: false,
            error: 'Attach a rubric before enabling rubric scoring.'
        };
    }

    if (rubric && rubric.sectionId !== assessmentSectionId) {
        return {
            isValid: false,
            error: 'Rubric does not belong to this section.'
        };
    }

    return { isValid: true };
}

/**
 * 8. Evaluates grading a student submission using rubric criteria.
 * Conforms to PostgreSQL: fn_grade_submission_rubric
 */
export function processGradeSubmissionRubric(
    submission: AssessmentSubmissionRecord,
    attachedRubric: RubricRecord | null,
    evaluations: RubricEvaluationInput[],
    overallFeedback: string,
    graderUserId: string
): {
    success: boolean;
    message: string;
    rawScore?: number;
    updatedSubmission?: AssessmentSubmissionRecord;
    savedEvaluations?: RubricEvaluationRecord[];
} {
    if (!attachedRubric) {
        return {
            success: false,
            message: 'No rubric attached to this assessment.'
        };
    }

    let totalEarned = 0;
    const savedEvaluations: RubricEvaluationRecord[] = [];

    for (const ev of evaluations) {
        const criterion = attachedRubric.criteria.find((c) => c.id === ev.criteria_id);
        if (!criterion) {
            return {
                success: false,
                message: 'A criterion does not belong to the attached rubric.'
            };
        }

        const pts = Number(ev.points_earned);
        if (isNaN(pts) || pts < 0 || pts > criterion.max_points) {
            return {
                success: false,
                message: `Points for criterion "${criterion.title}" must be between 0 and ${criterion.max_points}.`
            };
        }

        savedEvaluations.push({
            id: `eval-${submission.id}-${criterion.id}`,
            submissionId: submission.id,
            criteriaId: criterion.id,
            pointsEarned: pts,
            feedback: ev.feedback
                ? ev.feedback.trim()
                : null,
            evaluatedBy: graderUserId,
            evaluatedAt: new Date()
                .toISOString()
        });

        totalEarned += pts;
    }

    const updatedSubmission: AssessmentSubmissionRecord = {
        ...submission,
        rawScore: totalEarned,
        finalScore: totalEarned,
        feedback: overallFeedback
            ? overallFeedback.trim()
            : null,
        status: 'Graded',
        gradedAt: new Date()
            .toISOString(),
        gradedBy: graderUserId
    };

    return {
        success: true,
        message: 'Rubric grade saved.',
        rawScore: totalEarned,
        updatedSubmission,
        savedEvaluations
    };
}

/**
 * 9. Evaluates student rubric result visibility and score withholding.
 * Conforms to PostgreSQL: fn_get_my_assessment_result
 */
export function evaluateStudentRubricResultVisibility(
    submission: AssessmentSubmissionRecord,
    assessmentItem: AssessmentItemRecord,
    rubric: RubricRecord | null,
    rubricEvaluations: RubricEvaluationRecord[],
    now: Date
): {
    resultsAvailable: boolean;
    rawScore: number | null;
    finalScore: number | null;
    feedback: string | null;
    rubricData: SubmissionRubric | null;
} {
    const isGradedOrReturned
        = submission.status === 'Graded' || submission.status === 'Returned';
    const isShowDatePassed
        = !assessmentItem.showResultsAt
        || new Date(assessmentItem.showResultsAt)
            .getTime() <= now.getTime();

    const resultsAvailable = isGradedOrReturned && isShowDatePassed;

    let rubricData: SubmissionRubric | null = null;
    if (rubric) {
        rubricData = {
            submission_id: submission.id,
            rubric_id: rubric.id,
            title: rubric.title,
            total_points: rubric.totalPoints,
            criteria: rubric.criteria.map((rc) => {
                const evalRec = rubricEvaluations.find((e) => e.criteriaId === rc.id);
                return {
                    id: rc.id,
                    title: rc.title,
                    description: rc.description,
                    max_points: rc.max_points,
                    sequence: rc.sequence,
                    points_earned: resultsAvailable && evalRec
                        ? evalRec.pointsEarned
                        : null,
                    feedback: resultsAvailable && evalRec
                        ? evalRec.feedback
                        : null
                };
            })
        };
    }

    return {
        resultsAvailable,
        rawScore: resultsAvailable
            ? submission.rawScore
            : null,
        finalScore: resultsAvailable
            ? submission.finalScore
            : null,
        feedback: resultsAvailable
            ? submission.feedback
            : null,
        rubricData
    };
}

/**
 * 10. Evaluates copying a rubric across sections with faculty ownership enforcement.
 * Conforms to PostgreSQL: fn_copy_rubric_to_sections
 */
export function evaluateCopyRubricToSections(
    rubric: RubricRecord,
    sourceSectionFacultyId: string,
    targetSections: TargetSectionInfo[],
    currentUserId: string
): { success: boolean; message: string; copiedCount: number; newRubrics?: RubricRecord[] } {
    if (currentUserId !== sourceSectionFacultyId) {
        return {
            success: false,
            message: 'Forbidden: you do not teach the source section.',
            copiedCount: 0
        };
    }

    if (!targetSections || targetSections.length === 0) {
        return {
            success: false,
            message: 'Select at least one target section.',
            copiedCount: 0
        };
    }

    const nonTaughtTargets = targetSections.filter(
        (ts) => ts.facultyId !== currentUserId
    );
    if (nonTaughtTargets.length > 0) {
        return {
            success: false,
            message: 'Forbidden: you do not teach every target section.',
            copiedCount: 0
        };
    }

    const validTargets = targetSections.filter((ts) => ts.id !== rubric.sectionId);
    const newRubrics: RubricRecord[] = validTargets.map((target) => ({
        id: `copied-rubric-${target.id}-${Date.now()}`,
        sectionId: target.id,
        title: rubric.title,
        description: rubric.description,
        totalPoints: rubric.totalPoints,
        isActive: rubric.isActive,
        criteria: rubric.criteria.map((c) => ({ ...c }))
    }));

    return {
        success: true,
        message: `Rubric copied to ${newRubrics.length} section(s).`,
        copiedCount: newRubrics.length,
        newRubrics
    };
}