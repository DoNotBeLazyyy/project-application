import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { GradeReleaseListRow } from '@type/grade-release.type';

export async function listGradeRelease(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    termId: string | null
): Promise<ServiceResult<CommonListResDto<GradeReleaseListRow>>> {
    return callRpc<CommonListResDto<GradeReleaseListRow>>('fn_list_grade_release_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_id: termId || null
    });
}

export async function approveAndReleaseGrades(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_approve_and_release_grades', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}