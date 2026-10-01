import { callRpc } from '@services/supabase.wrapper';
import { AcademicStandingEvaluation, AcademicThreshold, AcademicThresholdUpdate } from '@type/academic-threshold.type';
import { ServiceResult } from '@type/service.type';

export async function getAcademicThresholds(): Promise<ServiceResult<AcademicThreshold[]>> {
    return callRpc<AcademicThreshold[]>('fn_get_academic_thresholds');
}

export async function updateAcademicThresholds(
    thresholds: AcademicThresholdUpdate[],
    deletedIds: string[] = []
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_academic_thresholds', {
        p_deleted_ids: deletedIds,
        p_thresholds: thresholds.map((t) => ({
            category: t.category,
            code: t.code,
            id: t.id && !t.id.startsWith('temp-')
                ? t.id
                : null,
            is_active: t.is_active,
            label: t.label,
            max_gwa: t.max_gwa,
            min_gwa: t.min_gwa,
            min_subject_grade: t.min_subject_grade,
            requires_no_failing: t.requires_no_failing,
            scholarship_discount_pct: t.scholarship_discount_pct,
            sort_order: t.sort_order
        }))
    });
}

export async function evaluateStudentAcademicStanding(
    studentId: string,
    schoolYearId?: string
): Promise<ServiceResult<AcademicStandingEvaluation>> {
    return callRpc<AcademicStandingEvaluation>('fn_evaluate_student_academic_standing', {
        p_student_id: studentId,
        p_school_year_id: schoolYearId || null
    });
}