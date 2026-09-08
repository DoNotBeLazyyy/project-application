import { callRpc } from '@services/supabase.wrapper';
import { AcademicThreshold, AcademicThresholdUpdate } from '@type/academic-threshold.type';
import { ServiceResult } from '@type/service.type';

export async function getAcademicThresholds(): Promise<ServiceResult<AcademicThreshold[]>> {
    return callRpc<AcademicThreshold[]>('fn_get_academic_thresholds');
}

export async function updateAcademicThresholds(
    thresholds: AcademicThresholdUpdate[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_academic_thresholds', {
        p_thresholds: thresholds.map((t) => ({
            id: t.id,
            min_gwa: t.min_gwa,
            max_gwa: t.max_gwa,
            min_subject_grade: t.min_subject_grade,
            requires_no_failing: t.requires_no_failing,
            scholarship_discount_pct: t.scholarship_discount_pct,
            is_active: t.is_active
        }))
    });
}