import { callRpc } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { SystemSettings, SystemSettingsFormValues } from '@type/system-settings.type';

export async function getSystemSettings(): Promise<ServiceResult<SystemSettings>> {
    return callRpc<SystemSettings>('fn_get_system_settings');
}

export async function updateSystemSettings(
    params: SystemSettingsFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_system_settings', {
        p_institution_name: params.institution_name,
        p_institution_short_name: params.institution_short_name,
        p_institution_address: params.institution_address,
        p_institution_email: params.institution_email,
        p_institution_phone: params.institution_phone,
        p_institution_mobile: params.institution_mobile,
        p_institution_website: params.institution_website,
        p_institution_logo_url: params.institution_logo_url,
        p_academic_year_start_month: Number(params.academic_year_start_month),
        p_max_units_per_term: Number(params.max_units_per_term),
        p_default_term_type_id: params.default_term_type_id || null,
        p_default_evaluation_scope: params.default_evaluation_scope || 'Period'
    });
}