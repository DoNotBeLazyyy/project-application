import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { CreateRoleFormValues, RoleListRow, RoleOption, UpdateRoleFormValues } from '@type/role.type';
import { ServiceResult } from '@type/service.type';

export async function listRoles(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<RoleListRow>>> {
    return callRpc<CommonListResDto<RoleListRow>>('fn_list_roles_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getRoleById(roleId: string): Promise<ServiceResult<UpdateRoleFormValues>> {
    return callRpc<UpdateRoleFormValues>('fn_get_role_by_id', {
        p_role_id: roleId
    });
}

export async function getRoles(): Promise<ServiceResult<RoleOption[]>> {
    return callRpc<RoleOption[]>('fn_get_roles');
}

export async function createRole(params: CreateRoleFormValues): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_role', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label
    });
}

export async function updateRole(
    roleId: string,
    params: UpdateRoleFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_role', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_role_id: roleId
    });
}

export async function deleteRole(roleId: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_role', {
        p_role_id: roleId
    });
}