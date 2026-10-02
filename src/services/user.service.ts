import { callFunction, callRpc, callSingle } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import {
    InviteUserParams, UpdateUserFormValues, UpdateUserParams, UserFilterValues, UserListRow, UserOption
} from '@type/user.type';

export async function listUsers(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: UserFilterValues | null
): Promise<ServiceResult<CommonListResDto<UserListRow>>> {
    return callRpc<CommonListResDto<UserListRow>>('fn_list_users_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_role_code: filters?.role_code || null,
        p_status: filters?.status || null,
        p_city: filters?.city || null,
        p_province: filters?.province || null
    });
}

export async function inviteSingleUser(params: InviteUserParams): Promise<ServiceResult<null>> {
    return callFunction<null>('admin-user-provision', {
        action: 'invite_single_user',
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        role_code: params.role_code,
        redirect_to: `${window.location.origin}/set-password`
    });
}

export async function resendInvite(email: string): Promise<ServiceResult<null>> {
    return callFunction<null>('admin-user-provision', {
        action: 'resend_invite',
        email,
        redirect_to: `${window.location.origin}/set-password`
    });
}

export async function resetUserPassword(email: string): Promise<ServiceResult<null>> {
    return callFunction<null>('admin-user-provision', {
        action: 'reset_password',
        email,
        redirect_to: `${window.location.origin}/set-password`
    });
}

export async function deleteUsers(userIds: string[]): Promise<ServiceResult<null>> {
    const res = await callRpc<null>('fn_bulk_delete_users', { p_user_ids: userIds });
    if (!res.error) {
        return res;
    }
    return callSingle<null>((client) =>
        client.from('users').update({ status: 'Inactive', updated_at: new Date().toISOString() }).in('id', userIds)
    );
}

export async function updateUser(
    userId: string,
    params: UpdateUserParams
): Promise<ServiceResult<null>> {
    return callFunction<null>('admin-user-provision', {
        action: 'update_user',
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        role_codes: params.role_codes,
        user_id: userId
    });
}

export async function bulkProvisionUsers(
    users: InviteUserParams[]
): Promise<BulkImportResult> {
    const result = await callFunction<{ provisioned_count: number; errors: string[] }>('admin-user-provision', {
        action: 'bulk_provision_users',
        users,
        redirect_to: `${window.location.origin}/set-password`
    });

    if (result.error || !result.data) {
        return {
            provisioned_count: 0,
            errors: [result.error?.message ?? 'Bulk user provisioning failed.']
        };
    }

    return {
        provisioned_count: result.data.provisioned_count ?? 0,
        errors: result.data.errors ?? []
    };
}

export async function getUserById(userId: string): Promise<ServiceResult<UpdateUserFormValues>> {
    return callRpc<UpdateUserFormValues>('fn_get_user_by_id', {
        p_user_id: userId
    });
}

export async function getUsersByRoles(
    roleCodes?: string[]
): Promise<ServiceResult<UserOption[]>> {
    return callRpc<UserOption[]>('fn_get_users_by_roles', {
        p_role_codes: roleCodes ?? null
    });
}