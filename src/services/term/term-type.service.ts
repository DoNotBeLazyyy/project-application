import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { TermTypeFormValues, TermTypeListRow, TermTypeOption } from '@type/term/term-type.type';

export async function listTermTypes(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<TermTypeListRow>>> {
    return callRpc<CommonListResDto<TermTypeListRow>>('fn_list_term_types_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getTermTypeById(
    termTypeId: string
): Promise<ServiceResult<TermTypeFormValues>> {
    return callRpc<TermTypeFormValues>('fn_get_term_type_by_id', {
        p_term_type_id: termTypeId
    });
}

export async function getTermTypes(): Promise<ServiceResult<TermTypeOption[]>> {
    return callRpc<TermTypeOption[]>('fn_get_term_types');
}

export async function createTermType(
    params: TermTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_term_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_sequence: Number(params.sequence)
    });
}

export async function updateTermType(
    termTypeId: string,
    params: TermTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_term_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_sequence: Number(params.sequence),
        p_term_type_id: termTypeId
    });
}

export async function deleteTermType(
    termTypeId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_term_type', {
        p_term_type_id: termTypeId
    });
}