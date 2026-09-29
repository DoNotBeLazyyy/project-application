import { callRpc } from '@services/supabase.wrapper';
import {
    ApproveAndReleaseResult,
    GradeReleaseSchedule,
    SectionGradeSheetStudent,
    SectionGradeSubmissionRow
} from '@type/grade-release.type';
import { ServiceResult } from '@type/service.type';

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

export async function listSectionGradeSubmissions(
    termId: string,
    gradingPeriodId: string
): Promise<ServiceResult<SectionGradeSubmissionRow[]>> {
    return callRpc<SectionGradeSubmissionRow[]>('fn_list_section_grade_submissions', {
        p_grading_period_id: gradingPeriodId,
        p_term_id: termId
    });
}

export async function getSectionGradeSheet(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<SectionGradeSheetStudent[]>> {
    return callRpc<SectionGradeSheetStudent[]>('fn_list_grade_sheet', {
        p_grading_period_id: gradingPeriodId,
        p_section_id: sectionId
    });
}

export async function approveAndReleaseSection(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<ApproveAndReleaseResult>> {
    return callRpc<ApproveAndReleaseResult>('fn_approve_and_release_grades', {
        p_grading_period_id: gradingPeriodId,
        p_section_id: sectionId
    });
}