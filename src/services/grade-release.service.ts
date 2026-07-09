import { callRpc } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { GradeReleaseSchedule } from '@type/grade-release.type';

export async function listGradeReleaseSchedule(
    termId: string
): Promise<ServiceResult<GradeReleaseSchedule[]>> {
    return callRpc<GradeReleaseSchedule[]>('fn_list_grade_release_schedule', {
        p_term_id: termId
    });
}

export async function setGradingPeriodReleaseAt(
    gradingPeriodId: string,
    releaseAt: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_grading_period_release_at', {
        p_grading_period_id: gradingPeriodId,
        p_release_at: releaseAt
    });
}

export async function releaseGradingPeriodNow(
    gradingPeriodId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_release_grading_period_now', {
        p_grading_period_id: gradingPeriodId
    });
}