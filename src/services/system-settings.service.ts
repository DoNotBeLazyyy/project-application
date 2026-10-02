import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { SystemSettings, SystemSettingsFormValues } from '@type/system-settings.type';

export async function getSystemSettings(): Promise<ServiceResult<SystemSettings>> {
    return callRpc<SystemSettings>('fn_get_system_settings', undefined, { silent: true });
}

export async function updateSystemSettings(
    params: SystemSettingsFormValues
): Promise<ServiceResult<null>> {
    const result = await callRpc<null>('fn_update_system_settings', {
        p_allowed_upload_types: params.allowed_upload_types,
        p_academic_year_start_month: params.academic_year_start_month ? Number(params.academic_year_start_month) : 6,
        p_institution_address: params.institution_address,
        p_institution_email: params.institution_email,
        p_institution_logo_url: params.institution_logo_url,
        p_institution_mobile: params.institution_mobile,
        p_institution_name: params.institution_name,
        p_institution_phone: params.institution_phone,
        p_institution_short_name: params.institution_short_name,
        p_institution_website: params.institution_website,
        p_max_upload_size_mb: Number(params.max_upload_size_mb)
    });

    // If update failed because no system settings row existed, insert initial record
    if (result.error && result.error.message?.toLowerCase().includes('not found')) {
        const { error: insertError } = await supabase.from('system_settings').insert({
            academic_year_start_month: params.academic_year_start_month ? Number(params.academic_year_start_month) : 6,
            allowed_upload_types: params.allowed_upload_types,
            institution_address: params.institution_address,
            institution_email: params.institution_email,
            institution_logo_url: params.institution_logo_url,
            institution_mobile: params.institution_mobile,
            institution_name: params.institution_name,
            institution_phone: params.institution_phone,
            institution_short_name: params.institution_short_name,
            institution_website: params.institution_website,
            max_upload_size_mb: Number(params.max_upload_size_mb)
        });

        if (!insertError) {
            return { data: null, error: null };
        }
    }

    return result;
}