import { callRpc } from '@services/supabase.wrapper';
import {
    DepartmentFilterValues, DepartmentFormValues, DepartmentListRow, DepartmentOption
} from '@type/department.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listDepartments(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    _filters: DepartmentFilterValues | null
): Promise<ServiceResult<CommonListResDto<DepartmentListRow>>> {
    return callRpc<CommonListResDto<DepartmentListRow>>('fn_list_departments_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getDepartmentById(
    departmentId: string
): Promise<ServiceResult<DepartmentFormValues>> {
    return callRpc<DepartmentFormValues>('fn_get_department_by_id', {
        p_department_id: departmentId
    });
}

export async function getDepartments(): Promise<ServiceResult<DepartmentOption[]>> {
    return callRpc<DepartmentOption[]>('fn_get_departments');
}

export async function createDepartment(
    params: DepartmentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_department', {
        p_code: params.code,
        p_description: params.description || null,
        p_name: params.name
    });
}

export async function updateDepartment(
    departmentId: string,
    params: DepartmentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_department', {
        p_code: params.code,
        p_department_id: departmentId,
        p_description: params.description || null,
        p_name: params.name
    });
}

export async function deleteDepartment(
    departmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_department', {
        p_department_id: departmentId
    });
}

export async function bulkDeleteDepartments(
    departmentIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_departments', {
        p_department_ids: departmentIds
    });
}