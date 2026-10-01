import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { useLoadingStore } from '@stores/loading.store';
import { useToastStore } from '@stores/toast.store';
import { ChangePasswordFormValues, MyProfile, ProfileFormValues } from '@type/profile.type';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

export async function getMyProfile(): Promise<ServiceResult<MyProfile>> {
    return callRpc<MyProfile>('fn_get_my_profile');
}

export interface CreateStudentProfileParams {
    program_id?: string | null;
    year_level?: number;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    preferred_name?: string;
    mobile_number?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    date_of_birth?: string;
    gender?: string;
    civil_status?: string;
    nationality?: string;
}

export async function createMyStudentProfile(
    params: CreateStudentProfileParams
): Promise<ServiceResult<{ student_number: string }>> {
    return callRpc<{ student_number: string }>('fn_create_my_student_profile', {
        p_program_id: params.program_id || null,
        p_year_level: params.year_level || 1,
        p_first_name: params.first_name || null,
        p_middle_name: params.middle_name || null,
        p_last_name: params.last_name || null,
        p_suffix: params.suffix || null,
        p_preferred_name: params.preferred_name || null,
        p_mobile_number: params.mobile_number || null,
        p_address_line1: params.address_line1 || null,
        p_address_line2: params.address_line2 || null,
        p_city: params.city || null,
        p_province: params.province || null,
        p_postal_code: params.postal_code || null,
        p_date_of_birth: params.date_of_birth || null,
        p_gender: params.gender || null,
        p_civil_status: params.civil_status || null,
        p_nationality: params.nationality || null
    });
}

export async function updateMyProfile(
    params: ProfileFormValues
): Promise<ServiceResult<{ message?: string; pending_approval?: boolean } | null>> {
    return callRpc<{ message?: string; pending_approval?: boolean } | null>('fn_update_my_profile', {
        p_first_name: params.first_name,
        p_middle_name: params.middle_name || null,
        p_last_name: params.last_name,
        p_suffix: params.suffix || null,
        p_preferred_name: params.preferred_name || null,
        p_mobile_number: params.mobile_number || null,
        p_address_line1: params.address_line1 || null,
        p_address_line2: params.address_line2 || null,
        p_city: params.city || null,
        p_province: params.province || null,
        p_postal_code: params.postal_code || null,
        p_date_of_birth: params.date_of_birth || null,
        p_gender: params.gender || null,
        p_civil_status: params.civil_status || null,
        p_nationality: params.nationality || null
    });
}

export async function updateMyAvatar(
    avatarUrl: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_my_avatar', { p_avatar_url: avatarUrl });
}

export async function changeMyPassword(
    email: string,
    values: ChangePasswordFormValues
): Promise<ServiceResult<null>> {
    useLoadingStore.getState()
        .show();
    try {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email,
            password: values.current_password
        });

        if (reauthError) {
            const message = 'Your current password is incorrect.';
            useToastStore.getState()
                .showToast(message, 'error');
            return { data: null, error: { code: null, message, status: null } };
        }

        const { error } = await supabase.auth.updateUser({ password: values.new_password });

        if (error) {
            const parsed = parseServiceError(error);
            useToastStore.getState()
                .showToast(parsed.message, 'error');
            return { data: null, error: parsed };
        }

        useToastStore.getState()
            .showToast('Your password has been updated.', 'success');
        return { data: null, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        useToastStore.getState()
            .showToast(parsed.message, 'error');
        return { data: null, error: parsed };
    }
    finally {
        useLoadingStore.getState()
            .hide();
    }
}