import { callRpc, CallRpcOptions } from '@services/supabase.wrapper';
import {
    GradingPeriodTemplate,
    TransmutationRow
} from '@type/grading-config.type';
import { ServiceResult } from '@type/service.type';

/**
 * Loads the school's grade table (percentage ranges to grades).
 *
 * @param options - Pass `{ silent: true }` on screens that fall back without it.
 */
export async function getTransmutationTable(options?: CallRpcOptions): Promise<ServiceResult<TransmutationRow[]>> {
    return callRpc<TransmutationRow[]>('fn_get_transmutation_table', undefined, options);
}

export async function getGradingPeriodTemplates(): Promise<ServiceResult<GradingPeriodTemplate[]>> {
    return callRpc<GradingPeriodTemplate[]>('fn_get_grading_period_templates');
}