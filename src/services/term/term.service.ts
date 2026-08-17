import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { ActiveTerm, TermFilterValues, TermFormValues, TermListRow } from '@type/term/term.type';
import { nullIfBlank } from '@utils/uuid.util';

export async function listTerms(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: TermFilterValues | null
): Promise<ServiceResult<CommonListResDto<TermListRow>>> {
    return callRpc<CommonListResDto<TermListRow>>('fn_list_terms_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_school_year_id: filters?.school_year_id || null,
        p_status: filters?.status === 'All'
            ? null
            : filters?.status || null
    });
}

export async function getTermById(termId: string): Promise<ServiceResult<TermFormValues>> {
    return callRpc<TermFormValues>('fn_get_term_by_id', {
        p_term_id: termId
    });
}

export async function createTerm(params: TermFormValues): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_term', {
        p_school_year_id: nullIfBlank(params.school_year_id),
        p_term_type_id: nullIfBlank(params.term_type_id),
        p_start_date: nullIfBlank(params.start_date),
        p_end_date: nullIfBlank(params.end_date),
        p_enrollment_start_date: params.enrollment_start_date || null,
        p_enrollment_end_date: params.enrollment_end_date || null,
        p_grading_deadline: params.grading_deadline || null,
        p_evaluation_scope: params.evaluation_scope || null
    });
}

export async function updateTerm(
    termId: string,
    params: TermFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_term', {
        p_term_id: termId,
        p_school_year_id: nullIfBlank(params.school_year_id),
        p_term_type_id: nullIfBlank(params.term_type_id),
        p_start_date: nullIfBlank(params.start_date),
        p_end_date: nullIfBlank(params.end_date),
        p_enrollment_start_date: params.enrollment_start_date || null,
        p_enrollment_end_date: params.enrollment_end_date || null,
        p_grading_deadline: params.grading_deadline || null,
        p_evaluation_scope: params.evaluation_scope || null
    });
}

export async function advanceTermStatus(termId: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_advance_term_status', {
        p_term_id: termId
    });
}

export async function deleteTerm(termId: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_term', {
        p_term_id: termId
    });
}

export async function getActiveTerm(): Promise<ServiceResult<ActiveTerm>> {
    return callRpc<ActiveTerm>('fn_get_active_term');
}