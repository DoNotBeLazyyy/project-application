import { callRpc } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { TermTypeFormValues, TermTypeOption } from '@type/term/term-type.type';

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
