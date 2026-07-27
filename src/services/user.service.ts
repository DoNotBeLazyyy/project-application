import { supabaseAdmin } from '@services/supabase.admin';
import { callRpc } from '@services/supabase.wrapper';
import { useLoadingStore } from '@stores/loading.store';
import { BulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import {
    InviteUserParams, UpdateUserFormValues, UpdateUserParams, UserFilterValues, UserListRow, UserOption
} from '@type/user.type';
import { parseServiceError } from '@utils/error.util';

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
    useLoadingStore.getState()
        .show();
    try {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(params.email, {
            data: {
                first_name: params.first_name,
                last_name: params.last_name
            },
            redirectTo: `${window.location.origin}/set-password`
        });
        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        const provisionResult = await callRpc('fn_provision_single_user', {
            p_auth_id: data.user.id,
            p_email: params.email,
            p_first_name: params.first_name,
            p_last_name: params.last_name,
            p_role_code: params.role_code
        });

        if (provisionResult.error) {
            return { data: null, error: provisionResult.error };
        }

        return { data: null, error: null };
    }
    catch (err) {
        return { data: null, error: parseServiceError(err) };
    }
    finally {
        useLoadingStore.getState()
            .hide();
    }
}

export async function resendInvite(email: string): Promise<ServiceResult<null>> {
    useLoadingStore.getState()
        .show();
    try {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/set-password`
        });

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: null, error: null };
    }
    catch (err) {
        return { data: null, error: parseServiceError(err) };
    }
    finally {
        useLoadingStore.getState()
            .hide();
    }
}

export async function resetUserPassword(email: string): Promise<ServiceResult<null>> {
    useLoadingStore.getState()
        .show();
    try {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/set-password`
        });

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: null, error: null };
    }
    catch (err) {
        return { data: null, error: parseServiceError(err) };
    }
    finally {
        useLoadingStore.getState()
            .hide();
    }
}

export async function deleteUsers(userIds: string[]): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_users', { p_user_ids: userIds });
}

export async function updateUser(
    userId: string,
    params: UpdateUserParams
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_user', {
        p_user_id: userId,
        p_first_name: params.first_name,
        p_last_name: params.last_name,
        p_role_codes: params.role_codes
    });
}

export async function bulkProvisionUsers(
    users: InviteUserParams[]
): Promise<BulkImportResult> {
    const provisionedUsers = [];
    const errors: string[] = [];

    for (const user of users) {
        try {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                user.email,
                {
                    data: {
                        first_name: user.first_name,
                        last_name: user.last_name
                    },
                    redirectTo: `${window.location.origin}/set-password`
                }
            );

            if (error) {
                errors.push(`${user.email}: ${error.message}`);
                continue;
            }

            provisionedUsers.push({
                auth_id: data.user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role_code: user.role_code
            });
        }
        catch (err) {
            errors.push(`${user.email}: ${parseServiceError(err).message}`);
        }
    }

    if (!provisionedUsers.length) {
        return { provisioned_count: 0, errors };
    }

    const result = await callRpc<BulkImportResult>('fn_bulk_provision_users', {
        p_users: provisionedUsers
    });

    if (result.error) {
        return { provisioned_count: 0, errors: [...errors, result.error.message] };
    }

    return {
        provisioned_count: (result.data?.provisioned_count ?? 0),
        errors: [...errors, ...(result.data?.errors ?? [])]
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