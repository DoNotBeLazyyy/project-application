import { callRpc } from '@services/supabase.wrapper';
import {
    GradingPeriodTemplate,
    TransmutationRow
} from '@type/grading-config.type';
import { ServiceResult } from '@type/service.type';

export async function getTransmutationTable(): Promise<ServiceResult<TransmutationRow[]>> {
    return callRpc<TransmutationRow[]>('fn_get_transmutation_table');
}

export async function getGradingPeriodTemplates(): Promise<ServiceResult<GradingPeriodTemplate[]>> {
    return callRpc<GradingPeriodTemplate[]>('fn_get_grading_period_templates');
}
