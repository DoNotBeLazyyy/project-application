import { callRpc } from '@services/supabase.wrapper';
import { StaffProfileRequestRow } from '@type/admin-verification.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ProfileFormValues } from '@type/profile.type';
import { ServiceResult } from '@type/service.type';

export async function listStaffProfileRequests(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    roleCode: string | null,
    status: string | null
): Promise<ServiceResult<CommonListResDto<StaffProfileRequestRow>>> {
    return callRpc<CommonListResDto<StaffProfileRequestRow>>('fn_list_staff_profile_requests', {
        p_page: page,
        p_role_code: roleCode && roleCode !== 'All'
            ? roleCode
            : null,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_status: status && status !== 'All'
            ? status
            : null
    });
}

export async function approveStaffProfileRequest(
    requestId: string,
    editedChanges?: Partial<ProfileFormValues> | null,
    notes?: string | null
): Promise<ServiceResult<{ success: boolean; message?: string }>> {
    return callRpc<{ success: boolean; message?: string }>(
        'fn_approve_staff_profile_request',
        {
            p_edited_changes: editedChanges || null,
            p_notes: notes || null,
            p_request_id: requestId
        },
        { silent: true }
    );
}

export async function rejectStaffProfileRequest(
    requestId: string,
    reason: string
): Promise<ServiceResult<{ success: boolean; message?: string }>> {
    return callRpc<{ success: boolean; message?: string }>(
        'fn_reject_staff_profile_request',
        {
            p_reason: reason,
            p_request_id: requestId
        },
        { silent: true }
    );
}