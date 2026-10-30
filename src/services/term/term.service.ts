import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { ActiveTerm, TermFilterValues, TermListRow } from '@type/term/term.type';

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

export async function getActiveTerm(): Promise<ServiceResult<ActiveTerm>> {
    return callRpc<ActiveTerm>('fn_get_active_term');
}

export interface ExistingTermRecord {
    id: string;
    school_year_id: string;
    term_type_id: string;
}
