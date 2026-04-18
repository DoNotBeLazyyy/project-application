import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { SchoolYearFilterValues, SchoolYearFormValues, SchoolYearListRow, SchoolYearOption } from '@type/school-year.type';
import { ServiceResult } from '@type/service.type';

export async function listSchoolYears(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: SchoolYearFilterValues | null
): Promise<ServiceResult<CommonListResDto<SchoolYearListRow>>> {
    return callRpc<CommonListResDto<SchoolYearListRow>>('fn_list_school_years_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_is_active: filters?.is_active === 'true'
            ? true
            : filters?.is_active === 'false'
                ? false
                : null,
        p_year: filters?.year
            ? parseInt(filters.year)
            : null
    });
}

export async function getSchoolYearById(
    schoolYearId: string
): Promise<ServiceResult<SchoolYearFormValues>> {
    return callRpc<SchoolYearFormValues>('fn_get_school_year_by_id', {
        p_school_year_id: schoolYearId
    });
}

export async function createSchoolYear(
    params: SchoolYearFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_school_year', {
        p_code: params.code,
        p_end_date: params.end_date,
        p_is_active: params.is_active,
        p_label: params.label,
        p_start_date: params.start_date
    });
}

export async function updateSchoolYear(
    schoolYearId: string,
    params: SchoolYearFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_school_year', {
        p_code: params.code,
        p_end_date: params.end_date,
        p_is_active: params.is_active,
        p_label: params.label,
        p_school_year_id: schoolYearId,
        p_start_date: params.start_date
    });
}

export async function deleteSchoolYear(
    schoolYearId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_school_year', {
        p_school_year_id: schoolYearId
    });
}

export async function getSchoolYears(): Promise<ServiceResult<SchoolYearOption[]>> {
    return callRpc<SchoolYearOption[]>('fn_get_school_years');
}